import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addExerciseToRoutineDay, deleteExerciseFromRoutineDay, addRoutineWeek, duplicateRoutineWeek, updateRoutineName, deleteRoutineWeek, addRoutineMonth, renameRoutineMonth, deleteRoutineMonth, renameRoutineWeek } from './actions'
import ExerciseProgressChart from '../../../../components/ExerciseProgressChart'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import AddExerciseToRoutineDayForm from './AddExerciseToRoutineDayForm'
import RoutineNameEditor from './RoutineNameEditor'
import BackButton from './BackButton'
import WeekMonthSelector from './WeekMonthSelector'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
    params: {
        routineId: string
    }
    searchParams?: {
        day?: string
        week?: string
        month?: string
    }
}

type RoutineMonth = {
    id: string
    month_number: number
    name: string | null
}

type RoutineWeek = {
    id: string
    week_number: number
    name: string | null
    routine_month_id: string | null
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
    category: string | null
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
    exercise: ExerciseRelation | ExerciseRelation[] | null
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
            <div className="p-4 pb-24 text-foreground md:p-8">
                <h1 className="text-2xl font-bold md:text-3xl">Rutina</h1>
                <p className="mt-4 text-sm text-red-500">Rutina no encontrada.</p>
            </div>
        )
    }

    const [studentResult, weeksResult] = await Promise.all([
        supabase
            .from('students')
            .select('first_name, last_name')
            .eq('id', routine.student_id)
            .single(),
        supabase
            .from('routine_weeks')
            .select('id, week_number, name, routine_month_id')
            .eq('routine_id', routine.id)
            .order('week_number', { ascending: true }),
    ])

    const student = studentResult.data
    let weeks: RoutineWeek[] = (weeksResult.data as RoutineWeek[] | null) ?? []

    if (weeksResult.error) {
        console.error('[RoutineDetailPage] routine_weeks query error:', weeksResult.error.message, weeksResult.error.code)
    }

    // Auto-create week 1 for routines that predate multi-week support
    if (weeks.length === 0) {
        const { data: newWeek } = await supabase
            .from('routine_weeks')
            .insert({ routine_id: routine.id, week_number: 1 })
            .select('id, week_number, name, routine_month_id')
            .single()
        if (newWeek) weeks = [newWeek as RoutineWeek]
    }

    const { data: monthsData } = await supabase
        .from('routine_months')
        .select('id, month_number, name')
        .eq('routine_id', routine.id)
        .order('month_number', { ascending: true })

    const months: RoutineMonth[] = (monthsData as RoutineMonth[] | null) ?? []

    const selectedMonth: RoutineMonth | null =
        months.find((m) => m.id === searchParams?.month) ?? months[0] ?? null

    const weeksForMonth = selectedMonth
        ? weeks.filter((w) => w.routine_month_id === selectedMonth.id)
        : weeks

    const selectedWeek: RoutineWeek | null =
        weeksForMonth.find((w) => w.id === searchParams?.week) ?? weeksForMonth[0] ?? null

    let days: RoutineDay[] | null = null
    let daysError: unknown = null

    if (selectedWeek) {
        const result = await supabase
            .from('routine_days')
            .select('id, day_index, title')
            .eq('routine_week_id', selectedWeek.id)
            .order('day_index', { ascending: true })

        days = result.data as RoutineDay[] | null
        daysError = result.error ?? null
    }

    // Auto-repair: seed default days for week 1 if empty (handles newly migrated routines)
    if (!daysError && selectedWeek?.week_number === 1 && (!days || days.length === 0)) {
        const daysPerWeek =
            typeof routine.days_per_week === 'number' &&
                routine.days_per_week >= 1 &&
                routine.days_per_week <= 6
                ? routine.days_per_week
                : 4

        const defaultDays = Array.from({ length: daysPerWeek }, (_, index) => ({
            routine_id: routine.id,
            routine_week_id: selectedWeek.id,
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
                .eq('routine_week_id', selectedWeek.id)
                .order('day_index', { ascending: true })

            days = reload.data as RoutineDay[] | null
            daysError = reload.error ?? null
        }
    }

    const { data: exerciseOptions } = await supabase
        .from('exercises')
        .select('id, name, muscle_group, category, metric_type')
        .order('name', { ascending: true })

    const typedDays: RoutineDay[] = (days as RoutineDay[] | null) ?? []

    const selectedDay =
        typedDays.find((day) => day.id === searchParams?.day) ?? typedDays[0] ?? null

    const exercisesByDay: Record<string, RoutineDayExercise[]> = {}
    const logsByExercise: Record<string, ExerciseLog[]> = {}

    const dayIds = typedDays.map((day) => day.id)

    if (dayIds.length > 0) {
        const { data: allExercises, error: exercisesError } = await supabase
            .from('routine_day_exercises')
            .select(`
                id,
                routine_day_id,
                exercise_id,
                sets,
                reps,
                rest_seconds,
                position,
                exercise:exercises!routine_day_exercises_exercise_id_fkey (
                    name,
                    muscle_group,
                    metric_type
                )
            `)
            .in('routine_day_id', dayIds)
            .order('routine_day_id', { ascending: true })
            .order('position', { ascending: true })

        if (exercisesError) {
            console.error('Error cargando ejercicios de la rutina:', exercisesError)
        }

        const typedExercises =
            (allExercises as unknown as RoutineDayExercise[] | null) ?? []

        for (const exercise of typedExercises) {
            if (!exercisesByDay[exercise.routine_day_id]) {
                exercisesByDay[exercise.routine_day_id] = []
            }
            exercisesByDay[exercise.routine_day_id].push(exercise)
        }

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

    const currentDayExercises = selectedDay
        ? exercisesByDay[selectedDay.id] ?? []
        : []

    const totalSetsForDay = currentDayExercises.reduce(
        (acc, ex) => acc + (ex.sets ?? 0),
        0
    )

    return (
        <div className="p-4 pb-24 text-foreground md:p-8">
            <div className="mx-auto max-w-3xl space-y-4 md:space-y-5">
                {/* Navbar */}
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div className="min-w-0 flex-1">
                        <RoutineNameEditor
                            routineId={routine.id}
                            initialName={routine.name ?? ''}
                            updateAction={updateRoutineName}
                        />
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                            {studentName} · {months.length} {months.length === 1 ? 'mesociclo' : 'mesociclos'} · {weeksForMonth.length} semanas
                        </p>
                    </div>
                    <Link
                        href={`/dashboard/students/${routine.student_id}/train`}
                        className="shrink-0 flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                        Entrenar
                    </Link>
                </div>

                {daysError ? (
                    <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                        Error cargando los días de la rutina.
                    </div>
                ) : (
                    <>
                        {/* ── Mesociclo selector ── */}
                        <WeekMonthSelector
                            routineId={routine.id}
                            months={months}
                            weeks={weeks}
                            selectedMonthId={selectedMonth?.id ?? null}
                            selectedWeekId={selectedWeek?.id ?? null}
                            addRoutineMonth={addRoutineMonth}
                            addRoutineWeek={addRoutineWeek}
                            duplicateRoutineWeek={duplicateRoutineWeek}
                            deleteRoutineWeek={deleteRoutineWeek}
                            deleteRoutineMonth={deleteRoutineMonth}
                            renameRoutineMonth={renameRoutineMonth}
                            renameRoutineWeek={renameRoutineWeek}
                        />

                        {!selectedDay ? (
                            <div className="rounded-2xl border border-border bg-card p-6">
                                <h2 className="text-base font-semibold text-card-foreground">
                                    Esta semana no tiene días
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Usá &ldquo;Duplicar semana anterior&rdquo; para copiar desde una semana existente.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Day tabs */}
                                <div className="rounded-2xl border border-border bg-card p-3 shadow-sm md:p-4">
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {typedDays.map((day) => {
                                            const isActive = day.id === selectedDay.id
                                            const label = day.title || `Día ${day.day_index}`

                                            return (
                                                <Link
                                                    key={day.id}
                                                    href={`/dashboard/routines/${routine.id}?month=${selectedMonth?.id}&week=${selectedWeek!.id}&day=${day.id}`}
                                                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                                        isActive
                                                            ? 'bg-indigo-600 text-white shadow-sm'
                                                            : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                                    }`}
                                                >
                                                    {label}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Day detail */}
                                <div className="rounded-2xl border border-border bg-card shadow-sm">
                                    <div className="border-b border-border p-4 md:p-5">
                                        <h2 className="truncate text-base font-bold text-card-foreground">
                                            {selectedDay.title || `Día ${selectedDay.day_index}`}
                                        </h2>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {currentDayExercises.length} ejercicios · {totalSetsForDay} series
                                        </p>
                                    </div>

                                    <div className="border-b border-border bg-muted/30 p-4 md:p-5">
                                        <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                                            Agregar ejercicio
                                        </p>

                                        <AddExerciseToRoutineDayForm
                                            serverAction={addExerciseToRoutineDay as unknown as (formData: FormData) => Promise<void>}
                                            routineId={routine.id}
                                            routineDayId={selectedDay.id}
                                            exerciseOptions={
                                                (exerciseOptions as ExerciseOption[] | null) ?? []
                                            }
                                            defaultSets={trainerProfile?.default_sets ?? 3}
                                            defaultReps={trainerProfile?.default_reps ?? 10}
                                            defaultRest={trainerProfile?.default_rest ?? 60}
                                        />
                                    </div>

                                    <div className="divide-y divide-border">
                                        {currentDayExercises.length > 0 ? (
                                            currentDayExercises.map((exercise, index) => {
                                                const logs = logsByExercise[exercise.id] || []
                                                const latestLog = logs[0]

                                                const relation = Array.isArray(exercise.exercise)
                                                    ? exercise.exercise[0]
                                                    : exercise.exercise

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
                                                        className="p-3"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-secondary-foreground">
                                                                        {index + 1}
                                                                    </div>

                                                                    <h3 className="truncate text-sm font-semibold text-card-foreground">
                                                                        {relation?.name ?? 'Ejercicio'}
                                                                    </h3>

                                                                    {relation?.muscle_group && (
                                                                        <span className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                                            {relation.muscle_group}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    {exercise.sets ?? '-'} × {isTime
                                                                        ? exercise.reps != null ? `${exercise.reps} min` : '-'
                                                                        : `${exercise.reps ?? '-'} reps`}
                                                                    {exercise.rest_seconds ? ` · ${exercise.rest_seconds}s` : ''}
                                                                </p>
                                                            </div>

                                                            <form action={deleteExerciseFromRoutineDay}>
                                                                <input type="hidden" name="routineId" value={routine.id} />
                                                                <input type="hidden" name="exerciseId" value={exercise.id} />
                                                                <input type="hidden" name="dayId" value={selectedDay.id} />
                                                                <input type="hidden" name="weekId" value={selectedWeek!.id} />
                                                                <button
                                                                    type="submit"
                                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-500 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                                                                    title="Eliminar ejercicio"
                                                                >
                                                                    <svg
                                                                        className="h-3.5 w-3.5"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="currentColor"
                                                                        strokeWidth={2}
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                        />
                                                                    </svg>
                                                                </button>
                                                            </form>
                                                        </div>

                                                        {latestLog && (
                                                            <p className="mt-1.5 text-xs text-muted-foreground">
                                                                {isTime
                                                                    ? latestLog.reps != null ? `${latestLog.reps} min` : '-'
                                                                    : `${latestLog.weight != null ? formatWeight(latestLog.weight, weightUnit) : '-'} · ${latestLog.reps ?? '-'} reps`}
                                                                {' · '}{latestLog.performed_at ?? '-'}
                                                                {isPR && <span className="ml-1 font-semibold text-emerald-500">🏆 PR</span>}
                                                            </p>
                                                        )}

                                                        {(() => {
                                                            const dailyLogs = Object.values(
                                                                logs.reduce<Record<string, ExerciseLog>>((acc, log) => {
                                                                    const date = (log.performed_at ?? log.id).split('T')[0]
                                                                    if (!acc[date]) {
                                                                        acc[date] = log
                                                                    } else {
                                                                        const best = isTime ? (acc[date].reps ?? 0) : (acc[date].weight ?? 0)
                                                                        const candidate = isTime ? (log.reps ?? 0) : (log.weight ?? 0)
                                                                        if (candidate > best) acc[date] = log
                                                                    }
                                                                    return acc
                                                                }, {})
                                                            ).slice(0, 3)

                                                            return dailyLogs.length > 1 ? (
                                                                <details className="mt-3 rounded-xl border border-border bg-card">
                                                                    <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-muted-foreground transition hover:text-card-foreground">
                                                                        Ver historial ({dailyLogs.length} días)
                                                                    </summary>

                                                                    <div className="border-t border-border p-3">
                                                                        <div className="space-y-1.5">
                                                                            {dailyLogs.map((log) => (
                                                                                <div
                                                                                    key={log.id}
                                                                                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs text-card-foreground"
                                                                                >
                                                                                    <span className="text-muted-foreground">
                                                                                        {(log.performed_at ?? '-').split('T')[0]}
                                                                                    </span>
                                                                                    <span className="font-medium">
                                                                                        {isTime ? (
                                                                                            <>{log.reps != null ? `${log.reps} min` : '-'}</>
                                                                                        ) : (
                                                                                            <>
                                                                                                {log.weight != null
                                                                                                    ? formatWeight(log.weight, weightUnit)
                                                                                                    : '-'}{' '}
                                                                                                · {log.reps ?? '-'} reps
                                                                                            </>
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        {!isTime && (
                                                                            <div className="mt-3">
                                                                                <ExerciseProgressChart logs={logs} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </details>
                                                            ) : null
                                                        })()}
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="p-6 text-center text-sm text-muted-foreground">
                                                Todavía no hay ejercicios en este día. Usá el formulario de arriba para agregar.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
