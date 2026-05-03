import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { startWorkoutSession } from '@/app/dashboard/students/[studentId]/train/workout-session'
import { getExerciseMaxWeights } from '@/app/dashboard/students/[studentId]/train/train-focused-actions'
import TrainFocusedView from '@/app/dashboard/students/[studentId]/train/TrainFocusedView'

type PageProps = {
    searchParams?: {
        day?: string
        week?: string
        month?: string
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

export default async function AppTrainPage({ searchParams }: PageProps) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('name, student_id')
        .eq('id', user.id)
        .single()

    const studentId = profile?.student_id
    if (!studentId) redirect('/app')

    const { data: student } = await supabase
        .from('students')
        .select('id, first_name, last_name, trainer_id')
        .eq('id', studentId)
        .single()

    if (!student) redirect('/app')

    // Traer rutina asignada
    const { data: assignment } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', studentId)
        .maybeSingle()

    if (!assignment?.routine_id) {
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

    const { data: routine } = await supabase
        .from('routines')
        .select('id, name')
        .eq('id', assignment.routine_id)
        .single()

    // Meses
    const { data: months } = await supabase
        .from('routine_months')
        .select('id, month_number, name')
        .eq('routine_id', assignment.routine_id)
        .order('month_number', { ascending: true })

    const selectedMonth = (months ?? []).find(m => m.id === searchParams?.month)
        ?? (months ?? [])[0]
        ?? null

    // Semanas
    const { data: weeks } = selectedMonth ? await supabase
        .from('routine_weeks')
        .select('id, week_number, name')
        .eq('routine_month_id', selectedMonth.id)
        .order('week_number', { ascending: true })
        : { data: [] }

    const selectedWeek = (weeks ?? []).find(w => w.id === searchParams?.week)
        ?? (weeks ?? [])[0]
        ?? null

    // Días de la semana activa
    const { data: routineDays } = selectedWeek ? await supabase
        .from('routine_days')
        .select('id, name, day_index')
        .eq('routine_week_id', selectedWeek.id)
        .order('day_index', { ascending: true })
        : { data: [] }

    // Buscar el primer día con ejercicios si no hay searchParam
    let selectedDayId: string | null = null

    if (searchParams?.day && (routineDays ?? []).some(d => d.id === searchParams.day)) {
        selectedDayId = searchParams.day
    } else {
        // Tomar el primer día con ejercicios
        for (const day of routineDays ?? []) {
            const { count } = await supabase
                .from('routine_day_exercises')
                .select('id', { count: 'exact', head: true })
                .eq('routine_day_id', day.id)

            if ((count ?? 0) > 0) {
                selectedDayId = day.id
                break
            }
        }
        // Fallback al primer día
        if (!selectedDayId) selectedDayId = (routineDays ?? [])[0]?.id ?? null
    }

    const selectedDay = (routineDays ?? []).find(d => d.id === selectedDayId) ?? null

    // Ejercicios del día
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

    const exerciseIds = [...new Set(exercisesForDay.map(e => e.exercise_id).filter((id): id is string => Boolean(id)))]
    let exercises: ExerciseMeta[] = []

    if (exerciseIds.length > 0) {
        const { data } = await supabase
            .from('exercises')
            .select('id, name, metric_type')
            .in('id', exerciseIds)
        exercises = (data as ExerciseMeta[] | null) ?? []
    }

    const exerciseMap = new Map(exercises.map(e => [e.id, e]))

    const today = new Date().toISOString().slice(0, 10)
    const routineDayExerciseIds = exercisesForDay.map(e => e.id)

    const logsByExerciseId = new Map<string, {
        weights: (number | null)[]
        reps: (number | null)[]
        lastPerformedAt: string | null
    }>()

    if (routineDayExerciseIds.length > 0) {
        const { data: allLogs } = await supabase
            .from('exercise_logs')
            .select('id, routine_day_exercise_id, weight, reps, performed_at, created_at, set_index, workout_session_id')
            .eq('student_id', studentId)
            .in('routine_day_exercise_id', routineDayExerciseIds)
            .order('created_at', { ascending: false })
            .order('set_index', { ascending: true })

        const typedLogs = (allLogs as ExerciseLog[] | null) ?? []

        for (const exerciseRow of exercisesForDay) {
            const setsCount = Math.max(1, Number(exerciseRow.sets ?? 1))
            const logsForExercise = typedLogs.filter(l => l.routine_day_exercise_id === exerciseRow.id)
            if (logsForExercise.length === 0) continue

            const latestSessionId = logsForExercise[0]?.workout_session_id ?? null
            const latestCreatedAt = logsForExercise[0]?.created_at ?? null

            let latestSessionLogs = latestSessionId
                ? logsForExercise.filter(l => l.workout_session_id === latestSessionId)
                : latestCreatedAt
                    ? logsForExercise.filter(l => String(l.created_at ?? '').split('T')[0] === String(latestCreatedAt).split('T')[0])
                    : logsForExercise

            latestSessionLogs = latestSessionLogs
                .sort((a, b) => (a.set_index ?? 999) - (b.set_index ?? 999))
                .slice(0, setsCount)

            logsByExerciseId.set(exerciseRow.id, {
                weights: latestSessionLogs.map(l => l.weight ?? null),
                reps: latestSessionLogs.map(l => l.reps ?? null),
                lastPerformedAt: latestSessionLogs[0]?.performed_at ?? String(latestSessionLogs[0]?.created_at ?? '').split('T')[0] ?? null,
            })
        }
    }

    // Iniciar sesión
    let workoutSessionId: string | null = null
    if (selectedDayId && exercisesForDay.length > 0) {
        const sessionResult = await startWorkoutSession({
            studentId,
            trainerId: student.trainer_id,
            routineDayId: selectedDayId,
        })
        workoutSessionId = sessionResult.sessionId
    }

    const focusedExercises = exercisesForDay.map((exercise) => {
        const meta = exercise.exercise_id ? exerciseMap.get(exercise.exercise_id) ?? null : null
        const setsCount = Math.max(1, Number(exercise.sets ?? 1))
        const previousSession = logsByExerciseId.get(exercise.id)

        const previousWeights: (number | null)[] = Array.from({ length: setsCount }, (_, i) => previousSession?.weights[i] ?? null)
        const previousReps: (number | null)[] = Array.from({ length: setsCount }, (_, i) => previousSession?.reps[i] ?? null)

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
            lastPerformedAt: previousSession?.lastPerformedAt ?? null,
        }
    })

    const maxWeights = await getExerciseMaxWeights({ studentId, routineDayExerciseIds })

    const selectedDayLabel = selectedDay?.name?.trim()
        ? selectedDay.name.trim()
        : selectedDay?.day_index ? `Día ${selectedDay.day_index}` : 'Hoy'

    const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()

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
                    <p className="mb-2 text-xs text-muted-foreground">
                        {routine?.name}
                        {selectedMonth ? ` · ${selectedMonth.name || `Mes ${selectedMonth.month_number}`}` : ''}
                        {selectedWeek ? ` · ${selectedWeek.name || `Sem. ${selectedWeek.week_number}`}` : ''}
                    </p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {(routineDays ?? []).map((day, idx) => {
                            const label = day.name?.trim() || `Día ${day.day_index ?? idx + 1}`
                            const isActive = day.id === selectedDayId
                            return (
                                <a
                                    key={day.id}
                                    href={`/app/train?month=${selectedMonth?.id}&week=${selectedWeek?.id}&day=${day.id}`}
                                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isActive
                                            ? 'bg-indigo-600 text-white'
                                            : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                        }`}
                                >
                                    {label}
                                </a>
                            )
                        })}
                    </div>
                </div>
            </div>

            <TrainFocusedView
                key={workoutSessionId}
                sessionId={workoutSessionId}
                studentId={studentId}
                studentName={fullName}
                dayLabel={selectedDayLabel}
                routineName={routine?.name ?? ''}
                performedAt={today}
                exercises={focusedExercises}
                maxWeights={maxWeights}
                weightUnit="kg"
                returnHref="/app"
                showPrs={true}
            />
        </div>
    )
}