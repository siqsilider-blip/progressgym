import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
    deleteExerciseFromRoutineDay,
    addExerciseLog,
} from './actions'
import ExerciseProgressChart from '../../../../components/ExerciseProgressChart'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import AddExerciseToRoutineDayForm from './AddExerciseToRoutineDayForm'

type PageProps = {
    params: {
        routineId: string
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

export default async function RoutineDetailPage({ params }: PageProps) {
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
            <div className="p-8 text-white">
                <h1 className="text-3xl font-bold">Rutina</h1>
                <p className="mt-4 text-red-400">Rutina no encontrada.</p>
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
    const dayIds = typedDays.map((day) => day.id)

    const exercisesByDay: Record<string, RoutineDayExercise[]> = {}

    if (dayIds.length > 0) {
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
            .in('routine_day_id', dayIds)
            .order('position', { ascending: true })

        const typedExercises =
            (exercises as unknown as RoutineDayExercise[] | null) ?? []

        for (const exercise of typedExercises) {
            if (!exercisesByDay[exercise.routine_day_id]) {
                exercisesByDay[exercise.routine_day_id] = []
            }
            exercisesByDay[exercise.routine_day_id].push(exercise)
        }
    }

    const allExerciseIds = Object.values(exercisesByDay)
        .flat()
        .map((exercise) => exercise.id)

    const logsByExercise: Record<string, ExerciseLog[]> = {}

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

    return (
        <div className="p-8 text-white">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{routine.name}</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        {student
                            ? `Alumno: ${student.first_name} ${student.last_name}`
                            : 'Alumno no encontrado'}
                    </p>
                </div>

                <Link
                    href="/dashboard/routines"
                    className="text-sm text-zinc-300 hover:text-white"
                >
                    ← Volver
                </Link>
            </div>

            {daysError ? (
                <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-400">
                    Error cargando o reparando los días de la rutina.
                </div>
            ) : typedDays.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="text-lg font-semibold text-white">
                        No se pudieron generar los días de esta rutina
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">
                        La rutina existe, pero sigue sin registros en routine_days.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {typedDays.map((day) => {
                        const dayExercises = exercisesByDay[day.id] || []

                        return (
                            <div
                                key={day.id}
                                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                            >
                                <h2 className="text-lg font-semibold text-white">
                                    {day.title || `Día ${day.day_index}`}
                                </h2>

                                <p className="mt-2 text-sm text-zinc-400">
                                    Día {day.day_index}
                                </p>

                                <div className="mt-4">
                                    <AddExerciseToRoutineDayForm
                                        routineId={routine.id}
                                        routineDayId={day.id}
                                        exerciseOptions={
                                            (exerciseOptions as ExerciseOption[] | null) ?? []
                                        }
                                    />
                                </div>

                                <div className="mt-5 space-y-3">
                                    {dayExercises.length > 0 ? (
                                        dayExercises.map((exercise, index) => {
                                            const logs =
                                                logsByExercise[exercise.id] || []
                                            const latestLog = logs[0]

                                            const relation = Array.isArray(exercise.exercises)
                                                ? exercise.exercises[0]
                                                : exercise.exercises

                                            const isTime =
                                                relation?.metric_type === 'time'

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
                                                    className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium text-white">
                                                                    {index + 1}.{' '}
                                                                    {relation?.name ?? 'Ejercicio'}
                                                                </p>

                                                                <span
                                                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${isTime
                                                                            ? 'border-blue-500/20 bg-blue-500/15 text-blue-300'
                                                                            : 'border-green-500/20 bg-green-500/15 text-green-300'
                                                                        }`}
                                                                >
                                                                    {isTime ? 'Cardio' : 'Fuerza'}
                                                                </span>
                                                            </div>

                                                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                                                                <span>
                                                                    {exercise.sets ?? '-'} series
                                                                </span>

                                                                {isTime ? (
                                                                    <span>
                                                                        {exercise.reps != null
                                                                            ? `${exercise.reps} min objetivo`
                                                                            : 'Sin duración'}
                                                                    </span>
                                                                ) : (
                                                                    <span>
                                                                        {exercise.reps ?? '-'} reps
                                                                        objetivo
                                                                    </span>
                                                                )}

                                                                <span>
                                                                    Descanso:{' '}
                                                                    {exercise.rest_seconds
                                                                        ? `${exercise.rest_seconds}s`
                                                                        : '-'}
                                                                </span>
                                                            </div>

                                                            {latestLog ? (
                                                                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-xs text-zinc-300">
                                                                    <p className="font-medium text-zinc-100">
                                                                        Último registro
                                                                    </p>

                                                                    {isTime ? (
                                                                        <p className="mt-1">
                                                                            Duración:{' '}
                                                                            {latestLog.reps != null
                                                                                ? `${latestLog.reps} min`
                                                                                : '-'}{' '}
                                                                            · Fecha:{' '}
                                                                            {latestLog.performed_at ??
                                                                                '-'}
                                                                        </p>
                                                                    ) : (
                                                                        <p className="mt-1">
                                                                            Peso:{' '}
                                                                            {latestLog.weight != null
                                                                                ? formatWeight(
                                                                                    latestLog.weight,
                                                                                    weightUnit
                                                                                )
                                                                                : '-'}{' '}
                                                                            · Reps:{' '}
                                                                            {latestLog.reps ?? '-'}{' '}
                                                                            · Fecha:{' '}
                                                                            {latestLog.performed_at ??
                                                                                '-'}
                                                                        </p>
                                                                    )}

                                                                    {isPR && (
                                                                        <p className="mt-1 text-xs font-semibold text-green-400">
                                                                            🔥 Nuevo PR
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="mt-3 text-xs text-zinc-500">
                                                                    Todavía no hay registros de
                                                                    carga.
                                                                </p>
                                                            )}
                                                        </div>

                                                        <form
                                                            action={deleteExerciseFromRoutineDay}
                                                        >
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
                                                                className="rounded-lg border border-red-900 px-3 py-1 text-xs text-red-400 hover:bg-red-950/40"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </form>
                                                    </div>

                                                    <form
                                                        action={addExerciseLog}
                                                        className="mt-4 space-y-3 border-t border-zinc-800 pt-4"
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="routineId"
                                                            value={routine.id}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="studentId"
                                                            value={routine.student_id}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="routineDayExerciseId"
                                                            value={exercise.id}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="weight_unit"
                                                            value={weightUnit}
                                                        />

                                                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                                            {isTime
                                                                ? 'Registro de cardio'
                                                                : 'Registro de carga'}
                                                        </p>

                                                        {isTime ? (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input
                                                                    name="performed_reps"
                                                                    type="number"
                                                                    placeholder="Duración (min)"
                                                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                                                />
                                                                <input
                                                                    name="performed_at"
                                                                    type="date"
                                                                    defaultValue={new Date()
                                                                        .toISOString()
                                                                        .slice(0, 10)}
                                                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <input
                                                                    name="weight"
                                                                    type="number"
                                                                    step="0.5"
                                                                    placeholder={`Peso (${weightUnit})`}
                                                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                                                />
                                                                <input
                                                                    name="performed_reps"
                                                                    type="number"
                                                                    placeholder="Reps"
                                                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                                                />
                                                                <input
                                                                    name="performed_at"
                                                                    type="date"
                                                                    defaultValue={new Date()
                                                                        .toISOString()
                                                                        .slice(0, 10)}
                                                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                                                />
                                                            </div>
                                                        )}

                                                        <button
                                                            type="submit"
                                                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                                                        >
                                                            {isTime ? 'Guardar cardio' : 'Guardar carga'}
                                                        </button>
                                                    </form>

                                                    {logs.length > 0 && (
                                                        <div className="mt-4 border-t border-zinc-800 pt-4">
                                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                                                                Historial
                                                            </p>

                                                            <div className="space-y-2">
                                                                {logs.slice(0, 5).map((log) => (
                                                                    <div
                                                                        key={log.id}
                                                                        className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2 text-xs text-zinc-300"
                                                                    >
                                                                        {isTime ? (
                                                                            <>
                                                                                {log.performed_at ??
                                                                                    '-'}{' '}
                                                                                ·{' '}
                                                                                {log.reps != null
                                                                                    ? `${log.reps} min`
                                                                                    : '-'}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                {log.performed_at ??
                                                                                    '-'}{' '}
                                                                                ·{' '}
                                                                                {log.weight != null
                                                                                    ? formatWeight(
                                                                                        log.weight,
                                                                                        weightUnit
                                                                                    )
                                                                                    : '-'}{' '}
                                                                                ·{' '}
                                                                                {log.reps ?? '-'} reps
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {!isTime && (
                                                                <ExerciseProgressChart
                                                                    logs={logs}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <p className="text-sm text-zinc-500">
                                            Todavía no hay ejercicios en este día.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}