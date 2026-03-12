import { createClient } from '@/lib/supabase/server'

export type StudentTopProgressChartItem = {
    exerciseName: string
    firstWeight: number
    bestWeight: number
    progressKg: number
    points: { label: string; weight: number }[]
}

export async function getStudentTopProgressCharts(
    studentId: string
): Promise<StudentTopProgressChartItem[]> {
    const supabase = await createClient()

    const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select(`
      weight,
      created_at,
      routine_day_exercise_id
    `)
        .eq('student_id', studentId)
        .not('weight', 'is', null)
        .order('created_at', { ascending: true })

    if (logsError || !logs) {
        console.error('Error fetching student top progress charts:', logsError)
        return []
    }

    const routineDayExerciseIds = Array.from(
        new Set(
            logs
                .map((log) => log.routine_day_exercise_id)
                .filter((id) => id !== null)
        )
    )

    if (routineDayExerciseIds.length === 0) {
        return []
    }

    const { data: routineDayExercises, error: rdeError } = await supabase
        .from('routine_day_exercises')
        .select('id, exercise_id')
        .in('id', routineDayExerciseIds)

    if (rdeError || !routineDayExercises) {
        console.error(
            'Error fetching routine_day_exercises for top progress charts:',
            rdeError
        )
        return []
    }

    const exerciseIds = Array.from(
        new Set(
            routineDayExercises
                .map((item) => item.exercise_id)
                .filter((id) => id !== null)
        )
    )

    if (exerciseIds.length === 0) {
        return []
    }

    const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds)

    if (exercisesError || !exercises) {
        console.error(
            'Error fetching exercises for top progress charts:',
            exercisesError
        )
        return []
    }

    const routineDayExerciseToExerciseId = new Map<string, string>()
    for (const item of routineDayExercises) {
        if (item.id && item.exercise_id) {
            routineDayExerciseToExerciseId.set(item.id, item.exercise_id)
        }
    }

    const exerciseIdToName = new Map<string, string>()
    for (const exercise of exercises) {
        if (exercise.id) {
            exerciseIdToName.set(exercise.id, exercise.name ?? 'Ejercicio')
        }
    }

    const grouped = new Map<
        string,
        {
            exerciseName: string
            points: { label: string; weight: number }[]
        }
    >()

    for (const log of logs as any[]) {
        const routineDayExerciseId = log.routine_day_exercise_id
        if (!routineDayExerciseId || log.weight == null) continue

        const exerciseId = routineDayExerciseToExerciseId.get(routineDayExerciseId)
        if (!exerciseId) continue

        const exerciseName = exerciseIdToName.get(exerciseId) ?? 'Ejercicio'
        const weight = Number(log.weight)

        const point = {
            label: new Date(log.created_at).toISOString().slice(0, 10),
            weight,
        }

        if (!grouped.has(exerciseId)) {
            grouped.set(exerciseId, {
                exerciseName,
                points: [point],
            })
        } else {
            const current = grouped.get(exerciseId)!
            current.points.push(point)
            grouped.set(exerciseId, current)
        }
    }

    const charts: StudentTopProgressChartItem[] = []

    for (const [, value] of grouped) {
        if (value.points.length < 2) continue

        const weights = value.points.map((p) => p.weight)

        const firstWeight = weights[0]
        const bestWeight = Math.max(...weights)
        const progressKg = bestWeight - firstWeight

        if (progressKg > 0) {
            charts.push({
                exerciseName: value.exerciseName,
                firstWeight,
                bestWeight,
                progressKg,
                points: value.points,
            })
        }
    }

    return charts.sort((a, b) => b.progressKg - a.progressKg).slice(0, 3)
}