import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { type WeightUnit } from '@/lib/weight'
import { startWorkoutSession } from './workout-session'
import { getExerciseMaxWeights } from './train-focused-actions'
import TrainFocusedView from './TrainFocusedView'

type PageProps = {
    params: { studentId: string }
    searchParams?: {
        day?: string
        week?: string
        month?: string
        saved?: string
        error?: string
        from?: string
    }
}

type ExerciseMeta = {
    id: string
    name: string | null
    metric_type: 'reps' | 'time' | null
}

type ExerciseLog = {
    id: string
    routine_day_exercise_id: string
    weight: number | null
    reps: number | null
    performed_at: string | null
    created_at: string | null
    set_index: number | null
    workout_session_id: string | null
}

export default async function StudentTrainPage({
    params,
    searchParams,
}: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const trainerProfile = await getTrainerProfile()
    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit
    const showPrs = trainerProfile?.show_prs ?? true

    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, trainer_id')
        .eq('id', params.studentId)
        .eq('trainer_id', user.id)
        .single()

    if (studentError || !student) {
        return (
            <div className="p-6 text-foreground">
                <h1 className="text-xl font-semibold">No se encontró el alumno.</h1>
            </div>
        )
    }

    let assignedRoutineId: string | null = null
    let routineName = 'Rutina asignada'

    const { data: assignment } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', params.studentId)
        .maybeSingle()

    if (assignment?.routine_id) {
        const { data: assignedRoutine } = await supabase
            .from('routines')
            .select('id, name, student_id, trainer_id')
            .eq('id', assignment.routine_id)
            .eq('trainer_id', user.id)
            .eq('student_id', params.studentId)
            .maybeSingle()

        if (assignedRoutine?.id) {
            assignedRoutineId = assignedRoutine.id
            routineName = assignedRoutine.name ?? 'Rutina asignada'
        }
    }

    if (!assignedRoutineId) {
        const { data: fallbackRoutine } = await supabase
            .from('routines')
            .select('id, name')
            .eq('student_id', params.studentId)
            .eq('trainer_id', user.id)
            .maybeSingle()

        if (fallbackRoutine?.id) {
            assignedRoutineId = fallbackRoutine.id
            routineName = fallbackRoutine.name ?? 'Rutina asignada'

            const { data: existingAssignment } = await supabase
                .from('student_routines')
                .select('id')
                .eq('student_id', params.studentId)
                .maybeSingle()

            if (existingAssignment?.id) {
                await supabase
                    .from('student_routines')
                    .update({
                        routine_id: fallbackRoutine.id,
                        assigned_at: new Date().toISOString(),
                    })
                    .eq('id', existingAssignment.id)
            } else {
                await supabase.from('student_routines').insert({
                    student_id: params.studentId,
                    routine_id: fallbackRoutine.id,
                    assigned_at: new Date().toISOString(),
                })
            }
        }
    }

    if (!assignedRoutineId) {
        return (
            <div className="p-6 text-foreground md:p-8">
                <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6">
                    <h1 className="text-2xl font-bold text-card-foreground">
                        {student.first_name} {student.last_name}
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Este alumno todavía no tiene una rutina asignada.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href={`/dashboard/students/${params.studentId}/assign-routine`}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                        >
                            Asignar rutina
                        </Link>

                        <Link
                            href={`/dashboard/students/${params.studentId}`}
                            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                        >
                            Volver al perfil
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const { data: routine } = await supabase
        .from('routines')
        .select('id, name')
        .eq('id', assignedRoutineId)
        .eq('student_id', params.studentId)
        .eq('trainer_id', user.id)
        .maybeSingle()

    // 1. Obtener meses de la rutina
    const { data: routineMonths } = await supabase
        .from('routine_months')
        .select('id, month_number, name')
        .eq('routine_id', assignedRoutineId)
        .order('month_number', { ascending: true })

    const months = routineMonths ?? []

    // 2. Seleccionar mes activo
    const selectedMonth = months.find(m => m.id === searchParams?.month)
        ?? months[0]
        ?? null

    // 3. Obtener semanas del mes activo
    const { data: monthWeeks } = selectedMonth ? await supabase
        .from('routine_weeks')
        .select('id, week_number, name')
        .eq('routine_month_id', selectedMonth.id)
        .order('week_number', { ascending: true })
        : { data: [] }

    const weeks = monthWeeks ?? []

    // 4. Seleccionar semana activa
    const selectedWeek = weeks.find(w => w.id === searchParams?.week)
        ?? weeks[0]
        ?? null

    // 5. Obtener días de la semana activa (NO de toda la rutina)
    const { data: routineDays } = selectedWeek ? await supabase
        .from('routine_days')
        .select('id, name, day_index')
        .eq('routine_week_id', selectedWeek.id)
        .order('day_index', { ascending: true })
        : { data: [] }

    const selectedDayId =
        searchParams?.day && (routineDays ?? []).some(d => d.id === searchParams.day)
            ? searchParams.day
            : (routineDays ?? [])[0]?.id ?? null

    const selectedDay = (routineDays ?? []).find(d => d.id === selectedDayId) ?? null

    let exercisesForDay: {
        id: string
        exercise_id: string | null
        sets: number | null
        reps: number | null
        rest_seconds: number | null
    }[] = []

    if (selectedDayId) {
        const { data: rde } = await supabase
            .from('routine_day_exercises')
            .select('id, exercise_id, sets, reps, rest_seconds')
            .eq('routine_day_id', selectedDayId)
            .order('position', { ascending: true, nullsFirst: false })

        exercisesForDay = rde ?? []
    }

    const exerciseIds = Array.from(
        new Set(
            exercisesForDay
                .map((item) => item.exercise_id)
                .filter((id): id is string => Boolean(id))
        )
    )

    let exercises: ExerciseMeta[] = []

    if (exerciseIds.length > 0) {
        const { data: exercisesData } = await supabase
            .from('exercises')
            .select('id, name, metric_type')
            .in('id', exerciseIds)

        exercises = (exercisesData as ExerciseMeta[] | null) ?? []
    }

    const exerciseMap = new Map<string, ExerciseMeta>()
    for (const exercise of exercises) {
        if (exercise.id) {
            exerciseMap.set(exercise.id, exercise)
        }
    }

    const today = new Date().toISOString().slice(0, 10)

    const totalExercises = exercisesForDay.length
    const totalSets = exercisesForDay.reduce((acc, item) => {
        return acc + Math.max(1, Number(item.sets ?? 1))
    }, 0)

    const selectedDayLabel = selectedDay?.name?.trim()
        ? selectedDay.name.trim()
        : (selectedDay as any)?.day_index
            ? `Día ${(selectedDay as any).day_index}`
            : 'Día seleccionado'

    const routineDayExerciseIds = exercisesForDay.map((item) => item.id)

    const logsByExerciseId = new Map<
        string,
        { weights: Array<number | null>; reps: Array<number | null>; lastPerformedAt: string | null }
    >()

    if (routineDayExerciseIds.length > 0) {
        const { data: allLogs } = await supabase
            .from('exercise_logs')
            .select(
                'id, routine_day_exercise_id, weight, reps, performed_at, created_at, set_index, workout_session_id'
            )
            .eq('student_id', params.studentId)
            .in('routine_day_exercise_id', routineDayExerciseIds)
            .order('created_at', { ascending: false })
            .order('set_index', { ascending: true })

        const typedLogs = (allLogs as ExerciseLog[] | null) ?? []

        for (const exerciseRow of exercisesForDay) {
            const setsCount = Math.max(1, Number(exerciseRow.sets ?? 1))

            const logsForExercise = typedLogs.filter(
                (log) => log.routine_day_exercise_id === exerciseRow.id
            )

            if (logsForExercise.length === 0) continue

            const latestSessionId = logsForExercise[0]?.workout_session_id ?? null
            const latestCreatedAt = logsForExercise[0]?.created_at ?? null

            let latestSessionLogs = latestSessionId
                ? logsForExercise.filter((log) => log.workout_session_id === latestSessionId)
                : latestCreatedAt
                    ? logsForExercise.filter((log) => {
                        const logDate = String(log.created_at ?? '').split('T')[0]
                        const latestDate = String(latestCreatedAt).split('T')[0]
                        return logDate === latestDate
                    })
                    : logsForExercise

            latestSessionLogs = latestSessionLogs
                .slice()
                .sort((a, b) => {
                    const aSet = a.set_index ?? 999
                    const bSet = b.set_index ?? 999
                    return aSet - bSet
                })
                .slice(0, setsCount)

            const weights = latestSessionLogs.map((log) => log.weight ?? null)
            const reps = latestSessionLogs.map((log) => log.reps ?? null)
            const lastPerformedAt = latestSessionLogs[0]?.performed_at ??
                String(latestSessionLogs[0]?.created_at ?? '').split('T')[0] ?? null

            logsByExerciseId.set(exerciseRow.id, {
                weights,
                reps,
                lastPerformedAt,
            })
        }
    }

    let workoutSessionId: string | null = null
    let sessionJustCompleted = false

    if (selectedDayId && exercisesForDay.length > 0) {
        const sessionResult = await startWorkoutSession({
            studentId: params.studentId,
            trainerId: user.id,
            routineDayId: selectedDayId,
        })
        workoutSessionId = sessionResult.sessionId
        sessionJustCompleted = sessionResult.justCompleted
    }

    const focusedExercises = exercisesForDay.map((exercise) => {
        const exerciseMeta = exercise.exercise_id
            ? exerciseMap.get(exercise.exercise_id) ?? null
            : null

        const setsCount = Math.max(1, Number(exercise.sets ?? 1))
        const previousSession = logsByExerciseId.get(exercise.id)

        const previousWeights: (number | null)[] = []
        const previousReps: (number | null)[] = []

        for (let i = 0; i < setsCount; i++) {
            previousWeights.push(previousSession?.weights[i] ?? null)
            previousReps.push(previousSession?.reps[i] ?? null)
        }

        return {
            id: exercise.id,
            exerciseId: exercise.exercise_id ?? null,
            exerciseName: exerciseMeta?.name ?? 'Ejercicio',
            isCardio: exerciseMeta?.metric_type === 'time',
            setsCount,
            targetReps: exercise.reps != null ? String(exercise.reps) : null,
            restSeconds: exercise.rest_seconds ?? 60,
            previousWeights,
            previousReps,
            lastPerformedAt: previousSession?.lastPerformedAt ?? null,
        }
    })

    const rdeIds = exercisesForDay.map((e) => e.id)
    const focusedMaxWeights = await getExerciseMaxWeights({
        studentId: params.studentId,
        routineDayExerciseIds: rdeIds,
    })

    const fullName =
        `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

    return (
        <div className="p-3 pb-52 text-foreground md:p-6 md:pb-36">
            <div className="mx-auto max-w-4xl">
                <div className="mb-4 border-b border-border pb-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="truncate text-base font-semibold text-foreground">
                                {student.first_name} {student.last_name}
                            </h1>
                            <p className="truncate text-xs text-muted-foreground">
                                {routine?.name ?? routineName}
                                {selectedMonth ? ` · ${selectedMonth.name || `Mes ${selectedMonth.month_number}`}` : ''}
                                {selectedWeek ? ` · ${selectedWeek.name || `Sem. ${selectedWeek.week_number}`}` : ''}
                            </p>
                        </div>

                        <Link
                            href={
                                searchParams?.from === 'routine' && assignedRoutineId
                                    ? `/dashboard/routines/${assignedRoutineId}`
                                    : `/dashboard/students/${params.studentId}`
                            }
                            className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground"
                        >
                            Volver
                        </Link>
                    </div>

                    <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                        {totalExercises} ejercicios · {totalSets} series · {weightUnit}
                    </p>
                </div>

                {searchParams?.saved === '1' && (
                    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Entrenamiento guardado correctamente.
                    </div>
                )}

                {searchParams?.error === 'empty' && (
                    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        Completá al menos una serie antes de guardar.
                    </div>
                )}

                {/* Selector de meses */}
                {months.length > 0 && (
                    <div className="mb-2 flex items-center gap-2">
                        <span className="w-16 shrink-0 text-[9px] font-medium uppercase tracking-widest text-muted-foreground/60">
                            Mesociclo
                        </span>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {months.map((month) => {
                                const isActive = month.id === selectedMonth?.id
                                return (
                                    <Link
                                        key={month.id}
                                        href={`/dashboard/students/${params.studentId}/train?month=${month.id}`}
                                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition ${
                                            isActive
                                                ? 'bg-indigo-600 text-white'
                                                : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {month.name || `Mes ${month.month_number}`}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Selector de semanas */}
                {weeks.length > 0 && (
                    <div className="mb-2 flex items-center gap-2">
                        <span className="w-16 shrink-0 text-[9px] font-medium uppercase tracking-widest text-muted-foreground/60">
                            Semana
                        </span>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {weeks.map((week) => {
                                const isActive = week.id === selectedWeek?.id
                                return (
                                    <Link
                                        key={week.id}
                                        href={`/dashboard/students/${params.studentId}/train?month=${selectedMonth?.id}&week=${week.id}`}
                                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition ${
                                            isActive
                                                ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500'
                                                : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {week.name || `Sem. ${week.week_number}`}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Selector de días */}
                {(routineDays ?? []).length > 0 && (
                    <div className="mb-4">
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {(routineDays ?? []).map((day, index) => {
                                const label = day.name?.trim() || `Día ${(day as any).day_index ?? index + 1}`
                                const isActive = day.id === selectedDayId
                                return (
                                    <Link
                                        key={day.id}
                                        href={`/dashboard/students/${params.studentId}/train?month=${selectedMonth?.id}&week=${selectedWeek?.id}&day=${day.id}`}
                                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                            isActive
                                                ? 'bg-indigo-600 text-white'
                                                : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {label}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {!selectedMonth ? (
                    <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                        Esta rutina no tiene mesociclos creados todavía.
                    </div>
                ) : !selectedWeek ? (
                    <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                        Este mesociclo no tiene semanas todavía.
                    </div>
                ) : !selectedDay ? (
                    <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                        Esta semana no tiene días creados todavía.
                    </div>
                ) : exercisesForDay.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-4">
                        <h3 className="text-lg font-semibold text-card-foreground">
                            Este día todavía no tiene ejercicios cargados.
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Agregá ejercicios a este día para poder registrar la sesión.
                        </p>
                    </div>
                ) : workoutSessionId ? (
                    <TrainFocusedView
                        key={workoutSessionId}
                        sessionId={workoutSessionId}
                        initialPhase={sessionJustCompleted ? 'summary' : 'training'}
                        studentId={student.id}
                        studentName={fullName}
                        dayLabel={selectedDayLabel}
                        routineName={routine?.name ?? routineName}
                        performedAt={today}
                        exercises={focusedExercises}
                        maxWeights={focusedMaxWeights}
                        weightUnit={weightUnit}
                        returnHref={`/dashboard/students/${params.studentId}`}
                        showPrs={showPrs}
                    />
                ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        No se pudo iniciar la sesión de entrenamiento. Intentá recargar la página.
                    </div>
                )}
            </div>
        </div>
    )
}
