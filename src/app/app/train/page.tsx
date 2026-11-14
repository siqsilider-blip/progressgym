import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { startWorkoutSession } from '@/app/dashboard/students/[studentId]/train/workout-session'
import { getExerciseMaxWeights } from '@/app/dashboard/students/[studentId]/train/train-focused-actions'
import StudentWorkoutView from './StudentWorkoutView'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'
import { getStudentRoutineWeekProgress } from '@/lib/studentRoutineWeekProgress'
import { getBuenosAiresDateString } from '@/lib/buenosAiresDate'
import { getActiveStudentRoutine } from '@/lib/getActiveStudentRoutine'
import { getStudentAppContext } from '@/lib/auth/student'

type PageProps = {
    searchParams?: Promise<{
        day?: string
        week?: string
        month?: string
        session?: string
        view?: string
    }>
}

type ExerciseMeta = {
    id: string
    name: string | null
    metric_type: 'reps' | 'time' | null
    video_url: string | null
    description: string | null
    muscle_group: string | null
    category: string | null
}

type ExerciseOverride = {
    exercise_id: string
    video_url: string | null
    instructions: string | null
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
    rpe: number | null
    workout_sessions: {
        status: string | null
        completed_manually: boolean | null
        performed_date: string | null
    } | {
        status: string | null
        completed_manually: boolean | null
        performed_date: string | null
    }[] | null
}

type RoutineBlock = 'activation' | 'main' | 'closing'

type HistoricalSessionSelection = {
    id: string
    routineDayId: string
    performedDate: string
    completionStatus: 'complete' | 'incomplete'
}

const BLOCK_ORDER: Record<RoutineBlock, number> = {
    activation: 0,
    main: 1,
    closing: 2,
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeBlock(block: string | null): RoutineBlock {
    return block === 'activation' || block === 'closing' ? block : 'main'
}

function getWorkoutSessionMeta(log: ExerciseLog) {
    return Array.isArray(log.workout_sessions)
        ? log.workout_sessions[0] ?? null
        : log.workout_sessions
}

function throwWorkoutLoadError(stage: string, error: unknown): never {
    console.error(`[AppTrainPage] ${stage}`, error)
    throw new Error('STUDENT_WORKOUT_LOAD_FAILED')
}

function HistoricalSessionUnavailable() {
    return (
        <div className="mx-auto max-w-lg p-6 pb-24 text-center">
            <p className="text-4xl">🕘</p>
            <p className="mt-3 text-sm font-semibold text-foreground">
                Esta sesión ya no está disponible
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                No modificamos ningún registro. Volvé al historial y elegí otra sesión.
            </p>
            <Link href="/app/history" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                Volver al historial
            </Link>
        </div>
    )
}

export default async function AppTrainPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const supabase = await createClient()
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const studentId = context.profile.student_id
    if (!studentId) redirect('/app')

    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, trainer_id')
        .eq('id', studentId)
        .single()

    if (studentError || !student) throwWorkoutLoadError('student', studentError)

    const requestedSessionId = searchParams?.session?.trim() || null
    let historicalSession: HistoricalSessionSelection | null = null
    let routineId: string
    let programStartedOn: string | null = null
    let requestedWeekId = searchParams?.week
    let requestedMonthId = searchParams?.month

    if (requestedSessionId) {
        if (!UUID_PATTERN.test(requestedSessionId)) return <HistoricalSessionUnavailable />

        const { data: session, error: sessionError } = await supabase
            .from('workout_sessions')
            .select('id, routine_day_id, performed_date, started_at, status, completed_manually, completion_status')
            .eq('id', requestedSessionId)
            .eq('student_id', studentId)
            .maybeSingle()

        if (sessionError) throwWorkoutLoadError('historical session', sessionError)

        const performedDate = session?.performed_date
            ?? String(session?.started_at ?? '').split('T')[0]

        if (
            !session
            || session.status !== 'completed'
            || session.completed_manually !== true
            || !session.routine_day_id
            || !/^\d{4}-\d{2}-\d{2}$/.test(performedDate)
        ) {
            return <HistoricalSessionUnavailable />
        }

        const { data: sessionDay, error: sessionDayError } = await supabase
            .from('routine_days')
            .select('id, routine_week_id')
            .eq('id', session.routine_day_id)
            .maybeSingle()

        if (sessionDayError) throwWorkoutLoadError('historical routine day', sessionDayError)
        if (!sessionDay?.routine_week_id) return <HistoricalSessionUnavailable />

        const { data: sessionWeek, error: sessionWeekError } = await supabase
            .from('routine_weeks')
            .select('id, routine_id, routine_month_id')
            .eq('id', sessionDay.routine_week_id)
            .maybeSingle()

        if (sessionWeekError) throwWorkoutLoadError('historical routine week', sessionWeekError)
        if (!sessionWeek?.routine_id) return <HistoricalSessionUnavailable />

        routineId = sessionWeek.routine_id
        requestedWeekId = sessionWeek.id
        requestedMonthId = sessionWeek.routine_month_id ?? undefined
        historicalSession = {
            id: session.id,
            routineDayId: session.routine_day_id,
            performedDate,
            completionStatus: session.completion_status === 'incomplete' ? 'incomplete' : 'complete',
        }
    } else {
        const assignment = await getActiveStudentRoutine(supabase, studentId)

        if (!assignment?.routineId) {
            return (
                <div className="p-6 pb-24 text-center">
                    <p className="text-4xl">📋</p>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                        Sin rutina asignada
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Tu entrenador todavía no te asignó una rutina.
                    </p>
                </div>
            )
        }

        routineId = assignment.routineId
        programStartedOn = assignment.programStartedOn
    }

    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .select('id, name')
        .eq('id', routineId)
        .maybeSingle()

    if (routineError) throwWorkoutLoadError('routine', routineError)
    if (!routine) {
        if (historicalSession) return <HistoricalSessionUnavailable />
        throwWorkoutLoadError('routine', { routineId })
    }

    const { selectedMonth, selectedWeek, selectedWeekStart, selectedWeekEnd } = await getRoutineSchedule(
        supabase,
        routineId,
        {
            requestedMonthId,
            requestedWeekId,
            programStartedOn,
        }
    )

    // Días de la semana activa
    let routineDays: { id: string; name: string | null; day_index: number | null }[] = []
    if (selectedWeek) {
        const { data, error } = await supabase
            .from('routine_days')
            .select('id, name, day_index')
            .eq('routine_week_id', selectedWeek.id)
            .order('day_index', { ascending: true })

        if (error) throwWorkoutLoadError('routine days', error)
        routineDays = data ?? []
    }

    // Elegir automáticamente una sesión en curso o el próximo día pendiente.
    let selectedDayId: string | null = null

    if (historicalSession) {
        selectedDayId = historicalSession.routineDayId
    } else if (searchParams?.day && routineDays.some(d => d.id === searchParams.day)) {
        selectedDayId = searchParams.day
    } else {
        const routineDayIds = routineDays.map((day) => day.id)
        let routineExerciseRows: { routine_day_id: string | null }[] = []
        if (routineDayIds.length > 0) {
            const { data, error } = await supabase
                .from('routine_day_exercises')
                .select('routine_day_id')
                .in('routine_day_id', routineDayIds)

            if (error) throwWorkoutLoadError('routine exercise days', error)
            routineExerciseRows = data ?? []
        }

        const daysWithExercises = new Set(
            routineExerciseRows.map((exercise) => exercise.routine_day_id).filter(Boolean)
        )
        const trainingDays = routineDays.filter((day) => daysWithExercises.has(day.id))

        if (trainingDays.length > 0) {
            const progress = await getStudentRoutineWeekProgress(
                supabase,
                studentId,
                trainingDays.map((day) => day.id),
                selectedWeekStart && selectedWeekEnd
                    ? { weekStart: selectedWeekStart, weekEnd: selectedWeekEnd }
                    : null
            )
            const nextDay = trainingDays.find(
                (day) => progress.statusByDayId.get(day.id) === 'in_progress'
            ) ?? trainingDays.find(
                (day) => progress.statusByDayId.get(day.id) !== 'completed'
            )

            if (!nextDay) {
                redirect(`/app/rutina?${selectedMonth ? `month=${selectedMonth.id}&` : ''}week=${selectedWeek?.id}`)
            }

            selectedDayId = nextDay.id
        }

        if (!selectedDayId) selectedDayId = routineDays[0]?.id ?? null
    }

    const selectedDay = routineDays.find(d => d.id === selectedDayId) ?? null
    if (historicalSession && !selectedDay) return <HistoricalSessionUnavailable />

    // Ejercicios del día
    let exercisesForDay: {
        id: string
        exercise_id: string | null
        sets: number | null
        reps: number | null
        rest_seconds: number | null
        position: number | null
        block: string | null
    }[] = []

    if (selectedDayId) {
        const { data: rde, error: routineExercisesError } = await supabase
            .from('routine_day_exercises')
            .select('id, exercise_id, sets, reps, rest_seconds, position, block')
            .eq('routine_day_id', selectedDayId)
            .order('position', { ascending: true, nullsFirst: false })

        if (routineExercisesError) throwWorkoutLoadError('routine day exercises', routineExercisesError)

        exercisesForDay = (rde ?? []).sort((a, b) => {
            const blockDifference = BLOCK_ORDER[normalizeBlock(a.block)] - BLOCK_ORDER[normalizeBlock(b.block)]
            if (blockDifference !== 0) return blockDifference
            return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
        })
    }

    const exercisesWithoutMetadataReference = exercisesForDay
        .filter((exercise) => !exercise.exercise_id)
        .map((exercise) => exercise.id)

    if (exercisesWithoutMetadataReference.length > 0) {
        throwWorkoutLoadError('routine exercises without exercise reference', {
            routineDayExerciseIds: exercisesWithoutMetadataReference,
        })
    }

    const exerciseIds = [...new Set(exercisesForDay.map(e => e.exercise_id).filter((id): id is string => Boolean(id)))]
    let exercises: ExerciseMeta[] = []

    if (exerciseIds.length > 0) {
        const { data, error } = await supabase
            .from('exercises')
            .select('id, name, metric_type, video_url, description, muscle_group, category')
            .in('id', exerciseIds)

        if (error) throwWorkoutLoadError('exercise metadata', error)
        exercises = (data as ExerciseMeta[] | null) ?? []
    }

    const exerciseMap = new Map(exercises.map(e => [e.id, e]))
    if (exerciseIds.some((exerciseId) => !exerciseMap.has(exerciseId))) {
        throwWorkoutLoadError('incomplete exercise metadata', { exerciseIds })
    }

    const exerciseOverrideMap = new Map<string, ExerciseOverride>()
    if (exerciseIds.length > 0) {
        const { data: exerciseOverrides, error: overridesError } = await supabase
            .from('trainer_exercise_overrides')
            .select('exercise_id, video_url, instructions')
            .eq('trainer_id', student.trainer_id)
            .in('exercise_id', exerciseIds)

        if (overridesError) {
            console.error('[AppTrainPage] optional exercise overrides', overridesError)
        } else {
            for (const override of (exerciseOverrides as ExerciseOverride[] | null) ?? []) {
                exerciseOverrideMap.set(override.exercise_id, override)
            }
        }
    }

    const today = getBuenosAiresDateString()
    const performedAt = historicalSession?.performedDate ?? today
    const routineDayExerciseIds = exercisesForDay.map(e => e.id)

    // Iniciar o recuperar la sesión antes de leer los registros. Así podemos
    // separar lo hecho hoy de la sesión anterior y evitar precargar referencias.
    let workoutSessionId: string | null = null
    let sessionJustCompleted = false
    let sessionCompletionStatus: 'complete' | 'incomplete' | null = null
    if (historicalSession && selectedDayId && exercisesForDay.length > 0) {
        workoutSessionId = historicalSession.id
        sessionJustCompleted = historicalSession.completionStatus === 'complete'
        sessionCompletionStatus = historicalSession.completionStatus
    } else if (selectedDayId && exercisesForDay.length > 0) {
        const sessionResult = await startWorkoutSession({
            studentId,
            trainerId: student.trainer_id,
            routineDayId: selectedDayId,
            allowCompleted: Boolean(searchParams?.day),
        })
        workoutSessionId = sessionResult.sessionId
        sessionJustCompleted = sessionResult.justCompleted
        sessionCompletionStatus = sessionResult.completionStatus
    }

    const logsByExerciseId = new Map<string, {
        weights: (number | null)[]
        reps: (number | null)[]
        currentWeights: (number | null)[]
        currentReps: (number | null)[]
        currentRpes: (number | null)[]
        lastPerformedAt: string | null
        setsCount: number
        hasCurrentLogs: boolean
    }>()

    if (routineDayExerciseIds.length > 0) {
        const { data: allLogs, error: logsError } = await supabase
            .from('exercise_logs')
            .select('id, routine_day_exercise_id, weight, reps, rpe, performed_at, created_at, set_index, workout_session_id, workout_sessions(status, completed_manually, performed_date)')
            .eq('student_id', studentId)
            .in('routine_day_exercise_id', routineDayExerciseIds)
            .order('created_at', { ascending: false })
            .order('set_index', { ascending: true })

        if (logsError) throwWorkoutLoadError('exercise logs', logsError)

        const typedLogs = (allLogs as ExerciseLog[] | null) ?? []

        for (const exerciseRow of exercisesForDay) {
            const logsForExercise = typedLogs.filter(l => l.routine_day_exercise_id === exerciseRow.id)
            const currentLogs = workoutSessionId
                ? logsForExercise.filter(l => l.workout_session_id === workoutSessionId)
                : []
            const configuredSetsCount = Math.max(1, Number(exerciseRow.sets ?? 1))
            const loggedSetsCount = currentLogs.reduce((maximum, log, fallbackIndex) =>
                Math.max(maximum, (log.set_index ?? fallbackIndex) + 1), 0)
            const setsCount = Math.max(configuredSetsCount, loggedSetsCount)
            const historicLogs = workoutSessionId
                ? logsForExercise.filter(l =>
                    l.workout_session_id !== workoutSessionId
                    && getWorkoutSessionMeta(l)?.status === 'completed'
                    && getWorkoutSessionMeta(l)?.completed_manually === true
                    && (!historicalSession
                        || Boolean(
                            getWorkoutSessionMeta(l)?.performed_date
                            && getWorkoutSessionMeta(l)!.performed_date! < historicalSession.performedDate
                        ))
                )
                : logsForExercise.filter(l =>
                    getWorkoutSessionMeta(l)?.status === 'completed'
                    && getWorkoutSessionMeta(l)?.completed_manually === true
                )

            const currentWeights: (number | null)[] = Array(setsCount).fill(null)
            const currentReps: (number | null)[] = Array(setsCount).fill(null)
            const currentRpes: (number | null)[] = Array(setsCount).fill(null)
            currentLogs.forEach((log, fallbackIndex) => {
                const index = log.set_index ?? fallbackIndex
                if (index < 0 || index >= setsCount) return
                currentWeights[index] = log.weight ?? null
                currentReps[index] = log.reps ?? null
                currentRpes[index] = log.rpe ?? null
            })

            if (historicLogs.length === 0) {
                logsByExerciseId.set(exerciseRow.id, {
                    weights: Array(setsCount).fill(null),
                    reps: Array(setsCount).fill(null),
                    currentWeights,
                    currentReps,
                    currentRpes,
                    lastPerformedAt: null,
                    setsCount,
                    hasCurrentLogs: currentLogs.length > 0,
                })
                continue
            }

            const latestSessionId = historicLogs[0]?.workout_session_id ?? null
            const latestCreatedAt = historicLogs[0]?.created_at ?? null

            let latestSessionLogs = latestSessionId
                ? historicLogs.filter(l => l.workout_session_id === latestSessionId)
                : latestCreatedAt
                    ? historicLogs.filter(l => String(l.created_at ?? '').split('T')[0] === String(latestCreatedAt).split('T')[0])
                    : historicLogs

            latestSessionLogs = latestSessionLogs
                .sort((a, b) => (a.set_index ?? 999) - (b.set_index ?? 999))
                .slice(0, setsCount)

            logsByExerciseId.set(exerciseRow.id, {
                weights: latestSessionLogs.map(l => l.weight ?? null),
                reps: latestSessionLogs.map(l => l.reps ?? null),
                currentWeights,
                currentReps,
                currentRpes,
                lastPerformedAt: latestSessionLogs[0]?.performed_at ?? String(latestSessionLogs[0]?.created_at ?? '').split('T')[0] ?? null,
                setsCount,
                hasCurrentLogs: currentLogs.length > 0,
            })
        }
    }

    const focusedExercises = exercisesForDay
        .filter((exercise) =>
            historicalSession?.completionStatus !== 'complete'
            || logsByExerciseId.get(exercise.id)?.hasCurrentLogs === true
        )
        .map((exercise) => {
        const meta = exercise.exercise_id ? exerciseMap.get(exercise.exercise_id) ?? null : null
        const override = exercise.exercise_id ? exerciseOverrideMap.get(exercise.exercise_id) ?? null : null
        const previousSession = logsByExerciseId.get(exercise.id)
        const setsCount = previousSession?.setsCount ?? Math.max(1, Number(exercise.sets ?? 1))

        const previousWeights: (number | null)[] = Array.from({ length: setsCount }, (_, i) => previousSession?.weights[i] ?? null)
        const previousReps: (number | null)[] = Array.from({ length: setsCount }, (_, i) => previousSession?.reps[i] ?? null)
        const currentWeights: (number | null)[] = Array.from({ length: setsCount }, (_, i) => previousSession?.currentWeights[i] ?? null)
        const currentReps: (number | null)[] = Array.from({ length: setsCount }, (_, i) => previousSession?.currentReps[i] ?? null)
        const currentRpes: (number | null)[] = Array.from({ length: setsCount }, (_, i) => previousSession?.currentRpes[i] ?? null)

        return {
            id: exercise.id,
            exerciseId: exercise.exercise_id ?? null,
            exerciseName: meta?.name ?? 'Ejercicio',
            isCardio: meta?.metric_type === 'time',
            setsCount,
            targetReps: exercise.reps != null ? String(exercise.reps) : null,
            restSeconds: exercise.rest_seconds ?? 60,
            previousWeights,
            previousReps,
            currentWeights,
            currentReps,
            currentRpes,
            lastPerformedAt: previousSession?.lastPerformedAt ?? null,
            video_url: override?.video_url ?? meta?.video_url ?? null,
            instructions: override?.instructions ?? meta?.description ?? null,
            muscleGroup: meta?.muscle_group ?? null,
            category: meta?.category ?? null,
            block: normalizeBlock(exercise.block),
        }
    })

    if (historicalSession && focusedExercises.length === 0) {
        return <HistoricalSessionUnavailable />
    }

    const visibleRoutineDayExerciseIds = focusedExercises.map((exercise) => exercise.id)
    const maxWeights = await getExerciseMaxWeights({
        studentId,
        routineDayExerciseIds: visibleRoutineDayExerciseIds,
    })

    const selectedDayLabel = selectedDay?.name?.trim()
        ? selectedDay.name.trim()
        : selectedDay?.day_index ? `Día ${selectedDay.day_index}` : 'Hoy'

    const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
    const routineReturnHref = `/app/rutina?${selectedMonth ? `month=${selectedMonth.id}&` : ''}week=${selectedWeek?.id}&day=${selectedDayId}&view=${searchParams?.view === 'month' ? 'month' : 'week'}`
    const returnHref = historicalSession ? '/app/history' : routineReturnHref
    const returnLabel = historicalSession ? 'Volver al historial' : 'Volver a la rutina'

    if (!selectedDay || exercisesForDay.length === 0) {
        return (
            <div className="p-6 pb-24 text-center">
                <p className="text-4xl">📭</p>
                <p className="mt-3 text-sm font-semibold text-foreground">
                    Este día no tiene ejercicios
                </p>
            </div>
        )
    }

    if (!workoutSessionId) {
        return (
            <div className="p-6 pb-24 text-center">
                <p className="text-sm text-muted-foreground">
                    No se pudo iniciar la sesión. Intentá recargar.
                </p>
            </div>
        )
    }

    // Selector de días visible arriba
    return (
        <div className="pb-24">
            {/* Day selector */}
            <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
                <div className="mx-auto max-w-lg">
                    {historicalSession ? (
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-xs text-muted-foreground">
                                    {routine?.name}
                                    {selectedWeek ? ` · ${selectedWeek.name || `Sem. ${selectedWeek.week_number}`}` : ''}
                                </p>
                                <p className="mt-0.5 text-xs font-bold text-foreground">
                                    Sesión del {historicalSession.performedDate.split('-').reverse().join('/')}
                                </p>
                            </div>
                            <Link href="/app/history" className="shrink-0 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground">
                                Historial
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="mb-2 text-xs text-muted-foreground">
                                {routine?.name}
                                {selectedMonth ? ` · ${selectedMonth.name || `Mes ${selectedMonth.month_number}`}` : ''}
                                {selectedWeek ? ` · ${selectedWeek.name || `Sem. ${selectedWeek.week_number}`}` : ''}
                            </p>
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {routineDays.map((day, idx) => {
                                    const label = day.name?.trim() || `Día ${day.day_index ?? idx + 1}`
                                    const isActive = day.id === selectedDayId
                                    return (
                                        <Link
                                            key={day.id}
                                            href={`/app/train?${selectedMonth ? `month=${selectedMonth.id}&` : ''}week=${selectedWeek?.id}&day=${day.id}`}
                                            prefetch={true}
                                            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isActive
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                                }`}
                                        >
                                            {label}
                                        </Link>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <StudentWorkoutView
                key={workoutSessionId}
                sessionId={workoutSessionId}
                studentId={studentId}
                studentName={fullName}
                dayLabel={selectedDayLabel}
                performedAt={performedAt}
                exercises={focusedExercises}
                maxWeights={maxWeights.values}
                prDetectionAvailable={maxWeights.available}
                weightUnit="kg"
                returnHref={returnHref}
                returnLabel={returnLabel}
                routineHref={returnHref}
                progressHref="/app/progress"
                showPrs={true}
                initialSummary={sessionJustCompleted}
                initialIncomplete={sessionCompletionStatus === 'incomplete'}
            />
        </div>
    )
}
