import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteExerciseFromRoutineDay } from './actions'
import ExerciseProgressChart from '../../../../components/ExerciseProgressChart'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import AddExerciseToRoutineDayForm from './AddExerciseToRoutineDayForm'

type PageProps = {
    params: {
        routineId: string
    }
    searchParams?: {
        day?: string
    }
}

type RoutineDay = {
    id: string
    day_index: number
    title: string | null
}

type ExerciseOption = {
    id: string
    name: string
    muscle_group: string | null
    metric_type: 'reps' | 'time' | null
}

type ExerciseRelation = {
    name: string
    muscle_group: string | null
    metric_type: 'reps' | 'time' | null
}

type RoutineDayExercise = {
    id: string
    routine_day_id: string
    exercise_id: string
    sets: number | null
    reps: number | null
    rest_seconds: number | null
    position: number | null
    exercises: ExerciseRelation | ExerciseRelation[] | null
}

type ExerciseLog = {
    id: string
    student_id: string
    routine_day_exercise_id: string
    weight: number | null
    reps: number | null
    performed_at: string | null
    created_at?: string | null
}

export default async function RoutineDetailPage({
    params,
    searchParams,
}: PageProps) {
    const supabase = await createClient()
    const trainerProfile = await getTrainerProfile()
    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .select('id, name, trainer_id, student_id, days_per_week')
        .eq('id', params.routineId)
        .eq('trainer_id', user.id)
        .single()

    if (routineError || !routine) {
        return (
            <div className="px-4 pb-6 text-foreground md:p-8">
                <h1 className="text-2xl font-bold md:text-3xl">Rutina</h1>
                <p className="mt-4 text-red-500">Rutina no encontrada.</p>
            </div>
        )
    }

    const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', routine.student_id)
        .single()

    let { data: days, error: daysError } = await supabase
        .from('routine_days')
        .select('id, day_index, title')
        .eq('routine_id', routine.id)
        .order('day_index', { ascending: true })

    if (!daysError && (!days || days.length === 0)) {
        const daysPerWeek =
            typeof routine.days_per_week === 'number' &&
                routine.days_per_week >= 1 &&
                routine.days_per_week <= 6
                ? routine.days_per_week
                : 4

        const defaultDays = Array.from({ length: daysPerWeek }, (_, index) => ({
            routine_id: routine.id,
            day_index: index + 1,
            title: `Día ${index + 1}`,
        }))

        const { error: repairError } = await supabase
            .from('routine_days')
            .insert(defaultDays)

        if (!repairError) {
            const reload = await supabase
                .from('routine_days')
                .select('id, day_index, title')
                .eq('routine_id', routine.id)
                .order('day_index', { ascending: true })

            days = reload.data ?? []
            daysError = reload.error ?? null
        }
    }

    const { data: exerciseOptions } = await supabase
        .from('exercises')
        .select('id, name, muscle_group, metric_type')
        .order('name', { ascending: true })

    const typedDays: RoutineDay[] = (days as RoutineDay[] | null) ?? []

    const selectedDay =
        typedDays.find((day) => day.id === searchParams?.day) ?? typedDays[0] ?? null

    const selectedDayIndex = selectedDay
        ? typedDays.findIndex((day) => day.id === selectedDay.id)
        : -1

    const previousDay =
        selectedDayIndex > 0 ? typedDays[selectedDayIndex - 1] : null

    const nextDay =
        selectedDayIndex >= 0 && selectedDayIndex < typedDays.length - 1
            ? typedDays[selectedDayIndex + 1]
            : null

    const exercisesByDay: Record<string, RoutineDayExercise[]> = {}
    const logsByExercise: Record<string, ExerciseLog[]> = {}

    if (selectedDay) {
        const { data: exercises } = await supabase
            .from('routine_day_exercises')
            .select(`
        id,
        routine_day_id,
        exercise_id,
        sets,
        reps,
        rest_seconds,
        position,
        exercises (
          name,
          muscle_group,
          metric_type
        )
      `)
            .eq('routine_day_id', selectedDay.id)
            .order('position', { ascending: true })

        const typedExercises =
            (exercises as unknown as RoutineDayExercise[] | null) ?? []

        exercisesByDay[selectedDay.id] = typedExercises

        const allExerciseIds = typedExercises.map((exercise) => exercise.id)

        if (allExerciseIds.length > 0) {
            const { data: logs } = await supabase
                .from('exercise_logs')
                .select(
                    'id, student_id, routine_day_exercise_id, weight, reps, performed_at, created_at'
                )
                .in('routine_day_exercise_id', allExerciseIds)
                .eq('student_id', routine.student_id)
                .order('performed_at', { ascending: false })
                .order('created_at', { ascending: false })

            const typedLogs = (logs as ExerciseLog[] | null) ?? []

            for (const log of typedLogs) {
                if (!logsByExercise[log.routine_day_exercise_id]) {
                    logsByExercise[log.routine_day_exercise_id] = []
                }
                logsByExercise[log.routine_day_exercise_id].push(log)
            }
        }
    }

    const studentName = student
        ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
        : 'Alumno no encontrado'

    return (
        <div className="px-4 pb-6 text-foreground md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-start md:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                        Rutina
                    </p>

                    <h1 className="mt-1 text-2xl font-bold text-card-foreground md:text-3xl">
                        {routine.name}
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Alumno: {studentName}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                            {typedDays.length} días
                        </span>
                        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                            Pesos en {weightUnit.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                    <Link
                        href={`/dashboard/students/${routine.student_id}/train`}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 md:w-auto"
                    >
                        Ir a entrenar este alumno
                    </Link>

                    <Link
                        href="/dashboard/routines"
                        className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground transition hover:bg-muted md:w-auto"
                    >
                        ← Volver
                    </Link>
                </div>
            </div>

            {daysError ? (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                    Error cargando o reparando los días de la rutina.
                </div>
            ) : typedDays.length === 0 || !selectedDay ? (
                <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="text-lg font-semibold text-card-foreground">
                        No se pudieron generar los días de esta rutina
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        La rutina existe, pero sigue sin registros en routine_days.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-card-foreground">Días</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Editá un día por vez.
                            </p>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {typedDays.map((day) => {
                                const isActive = day.id === selectedDay.id
                                const label = day.title || `Día ${day.day_index}`

                                return (
                                    <Link
                                        key={day.id}
                                        href={`/dashboard/routines/${routine.id}?day=${day.id}`}
                                        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${isActive
                                                ? 'bg-indigo-600 text-white'
                                                : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                            }`}
                                    >
                                        {label}
                                    </Link>
                                )
                            })}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                            {previousDay ? (
                                <Link
                                    href={`/dashboard/routines/${routine.id}?day=${previousDay.id}`}
                                    className="rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition hover:bg-muted"
                                >
                                    ← Anterior
                                </Link>
                            ) : (
                                <div />
                            )}

                            {nextDay ? (
                                <Link
                                    href={`/dashboard/routines/${routine.id}?day=${nextDay.id}`}
                                    className="rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition hover:bg-muted"
                                >
                                    Siguiente →
                                </Link>
                            ) : (
                                <div />
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-card-foreground">
                                    {selectedDay.title || `Día ${selectedDay.day_index}`}
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Día {selectedDay.day_index}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                                    {(exercisesByDay[selectedDay.id] || []).length} ejercicios
                                </div>

                                <Link
                                    href={`/dashboard/students/${routine.student_id}/train?day=${selectedDay.id}`}
                                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-500"
                                >
                                    Ir a entrenar este alumno
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/40 p-3 md:p-4">
                            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Agregar ejercicio
                            </p>

                            <AddExerciseToRoutineDayForm
                                routineId={routine.id}
                                routineDayId={selectedDay.id}
                                exerciseOptions={
                                    (exerciseOptions as ExerciseOption[] | null) ?? []
                                }
                            />
                        </div>

                        <div className="mt-4 space-y-3">
                            {(exercisesByDay[selectedDay.id] || []).length > 0 ? (
                                (exercisesByDay[selectedDay.id] || []).map((exercise, index) => {
                                    const logs = logsByExercise[exercise.id] || []
                                    const latestLog = logs[0]

                                    const relation = Array.isArray(exercise.exercises)
                                        ? exercise.exercises[0]
                                        : exercise.exercises

                                    const isTime = relation?.metric_type === 'time'

                                    const bestWeight = Math.max(
                                        ...logs.map((log) => log.weight || 0),
                                        0
                                    )

                                    const isPR =
                                        !isTime &&
                                        latestLog?.weight !== null &&
                                        latestLog?.weight === bestWeight &&
                                        logs.length > 1

                                    return (
                                        <div
                                            key={exercise.id}
                                            className="rounded-2xl border border-border bg-muted/40 p-4"
                                        >
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-base font-semibold text-card-foreground">
                                                                {index + 1}. {relation?.name ?? 'Ejercicio'}
                                                            </p>

                                                            <span
                                                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${isTime
                                                                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300'
                                                                        : 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/15 dark:text-green-300'
                                                                    }`}
                                                            >
                                                                {isTime ? 'Cardio' : 'Fuerza'}
                                                            </span>

                                                            {relation?.muscle_group && (
                                                                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                                                                    {relation.muscle_group}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                                                                {exercise.sets ?? '-'} series
                                                            </span>

                                                            {isTime ? (
                                                                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                                                                    {exercise.reps != null
                                                                        ? `${exercise.reps} min objetivo`
                                                                        : 'Sin duración'}
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                                                                    {exercise.reps ?? '-'} reps objetivo
                                                                </span>
                                                            )}

                                                            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                                                                Descanso:{' '}
                                                                {exercise.rest_seconds
                                                                    ? `${exercise.rest_seconds}s`
                                                                    : '-'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <form action={deleteExerciseFromRoutineDay}>
                                                        <input
                                                            type="hidden"
                                                            name="routineId"
                                                            value={routine.id}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="exerciseId"
                                                            value={exercise.id}
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="rounded-xl border border-red-300 px-3 py-2 text-xs text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </form>
                                                </div>

                                                <div className="rounded-xl border border-border bg-card p-3">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        {isTime ? 'Último registro' : 'Última carga'}
                                                    </p>

                                                    {latestLog ? (
                                                        <>
                                                            {isTime ? (
                                                                <p className="mt-2 text-sm text-card-foreground">
                                                                    {latestLog.reps != null
                                                                        ? `${latestLog.reps} min`
                                                                        : '-'}{' '}
                                                                    · {latestLog.performed_at ?? '-'}
                                                                </p>
                                                            ) : (
                                                                <p className="mt-2 text-sm text-card-foreground">
                                                                    {latestLog.weight != null
                                                                        ? formatWeight(
                                                                            latestLog.weight,
                                                                            weightUnit
                                                                        )
                                                                        : '-'}{' '}
                                                                    · {latestLog.reps ?? '-'} reps ·{' '}
                                                                    {latestLog.performed_at ?? '-'}
                                                                </p>
                                                            )}

                                                            {isPR && (
                                                                <p className="mt-1 text-xs font-semibold text-green-500">
                                                                    🔥 Nuevo PR
                                                                </p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <p className="mt-2 text-sm text-muted-foreground">
                                                            Todavía no hay registros.
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-200">
                                                        Las cargas se registran desde Entrenar
                                                    </p>
                                                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-300/80">
                                                        Acá planificás la rutina. Para cargar pesos y reps reales,
                                                        usá la pantalla de entrenamiento.
                                                    </p>
                                                </div>

                                                {logs.length > 0 && (
                                                    <details className="rounded-xl border border-border bg-card">
                                                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-card-foreground">
                                                            Ver historial
                                                        </summary>

                                                        <div className="border-t border-border px-4 py-4">
                                                            <div className="space-y-2">
                                                                {logs.slice(0, 5).map((log) => (
                                                                    <div
                                                                        key={log.id}
                                                                        className="rounded-lg border border-border bg-muted/40 p-2 text-xs text-card-foreground"
                                                                    >
                                                                        {isTime ? (
                                                                            <>
                                                                                {log.performed_at ?? '-'} ·{' '}
                                                                                {log.reps != null
                                                                                    ? `${log.reps} min`
                                                                                    : '-'}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                {log.performed_at ?? '-'} ·{' '}
                                                                                {log.weight != null
                                                                                    ? formatWeight(
                                                                                        log.weight,
                                                                                        weightUnit
                                                                                    )
                                                                                    : '-'}{' '}
                                                                                · {log.reps ?? '-'} reps
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {!isTime && (
                                                                <div className="mt-4">
                                                                    <ExerciseProgressChart logs={logs} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                    Todavía no hay ejercicios en este día.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}