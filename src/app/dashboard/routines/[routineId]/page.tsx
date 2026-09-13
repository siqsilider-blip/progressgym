import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addExerciseToRoutineDay, deleteExerciseFromRoutineDay, addRoutineWeek, duplicateRoutineWeek, updateRoutineName, deleteRoutineWeek, addRoutineMonth, renameRoutineMonth, deleteRoutineMonth, renameRoutineWeek, deleteTemplate, updateExerciseInRoutineDay, moveExerciseInRoutineDay } from './actions'
import ExerciseProgressChart from '../../../../components/ExerciseProgressChart'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import DayBlockEditor, { type DayExercise } from './DayBlockEditor'
import RoutineNameEditor from './RoutineNameEditor'
import BackButton from './BackButton'
import WeekMonthSelector from './WeekMonthSelector'
import DeleteTemplateButton from './DeleteTemplateButton'

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
    block?: 'activation' | 'main' | 'closing'
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
        .select('id, name, trainer_id, student_id, days_per_week, routine_kind')
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
                block,
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

        // Para un template (routine.student_id = null) no se consulta
        // exercise_logs en absoluto -- logsByExercise queda vacío para sus
        // ejercicios, sin depender de ninguna suposición sobre cómo
        // interpreta PostgREST un .eq() con valor null. Para un program, la
        // consulta queda exactamente igual que antes.
        if (allExerciseIds.length > 0 && routine.routine_kind !== 'template') {
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
        <div className="p-4 pb-24 text-foreground md:p-6">
            <div className="mx-auto max-w-3xl space-y-5">

                {/* ── Header ── */}
                <div className="flex items-center gap-3">
                    <BackButton />

                    <div className="min-w-0 flex-1">
                        <RoutineNameEditor
                            routineId={routine.id}
                            initialName={routine.name ?? ''}
                            updateAction={updateRoutineName}
                        />
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {routine.routine_kind === 'template' ? (
                                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                                    Template
                                </span>
                            ) : (
                                studentName
                            )}
                            <span className="mx-1.5 text-border">·</span>
                            {months.length} {months.length === 1 ? 'mesociclo' : 'mesociclos'}
                            <span className="mx-1.5 text-border">·</span>
                            {weeksForMonth.length} {weeksForMonth.length === 1 ? 'semana' : 'semanas'}
                        </p>
                    </div>

                    {routine.routine_kind === 'template' ? (
                        <div className="flex shrink-0 items-center gap-2">
                            <Link
                                href={`/dashboard/routines/${routine.id}/assign-to-student`}
                                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.97]"
                            >
                                Asignar
                            </Link>
                            <DeleteTemplateButton
                                routineId={routine.id}
                                deleteAction={deleteTemplate}
                            />
                        </div>
                    ) : (
                        <Link
                            href={`/dashboard/students/${routine.student_id}/train?from=routine${selectedMonth?.id ? `&month=${selectedMonth.id}` : ''}${selectedWeek?.id ? `&week=${selectedWeek.id}` : ''}${selectedDay?.id ? `&day=${selectedDay.id}` : ''}`}
                            className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.97]"
                        >
                            Entrenar
                        </Link>
                    )}
                </div>

                {daysError ? (
                    <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                        Error cargando los días de la rutina.
                    </div>
                ) : (
                    <>
                        {/* ── Mesociclo / Semana selector ── */}
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
                            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
                                <p className="text-sm font-medium text-card-foreground">
                                    Esta semana no tiene días
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Usá &ldquo;Duplicar semana anterior&rdquo; para copiar desde una semana existente.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* ── Day tabs ── */}
                                <div className="flex gap-1.5 overflow-x-auto pb-1">
                                    {typedDays.map((day) => {
                                        const isActive = day.id === selectedDay.id
                                        const label = day.title || `Día ${day.day_index}`
                                        const dayExercises = exercisesByDay[day.id] ?? []
                                        const hasDayExercises = dayExercises.length > 0

                                        return (
                                            <Link
                                                key={day.id}
                                                href={`/dashboard/routines/${routine.id}?week=${selectedWeek!.id}&day=${day.id}${selectedMonth?.id ? `&month=${selectedMonth.id}` : ''}`}
                                                className={`relative shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition active:scale-[0.96] ${isActive
                                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                                                        : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                                                    }`}
                                            >
                                                {label}
                                                {hasDayExercises && !isActive && (
                                                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                )}
                                            </Link>
                                        )
                                    })}
                                </div>

                                {/* ── Day header ── */}
                                <div className="flex items-end justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">
                                            {selectedDay.title || `Día ${selectedDay.day_index}`}
                                        </h2>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {currentDayExercises.length} {currentDayExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                                            <span className="mx-1.5 text-border">·</span>
                                            {totalSetsForDay} series
                                        </p>
                                    </div>
                                </div>

                                {/* ── Exercises ── */}
                                <DayBlockEditor
                                    routineId={routine.id}
                                    routineDayId={selectedDay.id}
                                    exercises={currentDayExercises.map(ex => ({ ...ex, block: ex.block || 'main' })) as DayExercise[]}
                                    exerciseOptions={(exerciseOptions as ExerciseOption[]) ?? []}
                                    defaultSets={trainerProfile?.default_sets ?? 3}
                                    defaultReps={trainerProfile?.default_reps ?? 10}
                                    defaultRest={trainerProfile?.default_rest ?? 60}
                                    addAction={addExerciseToRoutineDay as unknown as (fd: FormData) => Promise<any>}
                                    updateAction={updateExerciseInRoutineDay as unknown as (fd: FormData) => Promise<any>}
                                    moveAction={moveExerciseInRoutineDay}
                                    deleteAction={deleteExerciseFromRoutineDay as unknown as (fd: FormData) => Promise<any>}
                                    weekId={selectedWeek!.id}
                                    logsByExercise={logsByExercise}
                                    weightUnit={weightUnit}
                                />
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
