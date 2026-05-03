import { createClient } from '@/lib/supabase/server'

export type TrainerProgressRankingItem = {
    studentId: string
    studentName: string
    exerciseName: string
    firstWeight: number
    bestWeight: number
    progressKg: number
}

export async function getTrainerProgressRanking(): Promise<
    TrainerProgressRankingItem[]
> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return []

    const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('trainer_id', user.id)

    if (!students) return []

    const results: TrainerProgressRankingItem[] = []

    for (const student of students) {
        const { data: logs } = await supabase
            .from('exercise_logs')
            .select(`
        weight,
        created_at,
        routine_day_exercise_id
      `)
            .eq('student_id', student.id)
            .not('weight', 'is', null)
            .order('created_at', { ascending: true })

        if (!logs || logs.length === 0) continue

        const routineDayExerciseIds = Array.from(
            new Set(
                logs
                    .map((log) => log.routine_day_exercise_id)
                    .filter((id) => id !== null)
            )
        )

        const { data: routineDayExercises } = await supabase
            .from('routine_day_exercises')
            .select('id, exercise_id')
            .in('id', routineDayExerciseIds)

        if (!routineDayExercises) continue

        const exerciseIds = Array.from(
            new Set(
                routineDayExercises
                    .map((item) => item.exercise_id)
                    .filter((id) => id !== null)
            )
        )

        const { data: exercises } = await supabase
            .from('exercises')
            .select('id, name')
            .in('id', exerciseIds)

        const routineDayExerciseToExerciseId = new Map<string, string>()
        for (const item of routineDayExercises) {
            if (item.id && item.exercise_id) {
                routineDayExerciseToExerciseId.set(item.id, item.exercise_id)
            }
        }

        const exerciseIdToName = new Map<string, string>()
        for (const exercise of exercises ?? []) {
            exerciseIdToName.set(exercise.id, exercise.name ?? 'Ejercicio')
        }

        const grouped = new Map<
            string,
            {
                exerciseName: string
                firstWeight: number
                bestWeight: number
            }
        >()

        for (const log of logs as any[]) {
            const exerciseId = routineDayExerciseToExerciseId.get(
                log.routine_day_exercise_id
            )

            if (!exerciseId) continue

            const exerciseName = exerciseIdToName.get(exerciseId) ?? 'Ejercicio'
            const weight = Number(log.weight)

            if (!grouped.has(exerciseId)) {
                grouped.set(exerciseId, {
                    exerciseName,
                    firstWeight: weight,
                    bestWeight: weight,
                })
            } else {
                const current = grouped.get(exerciseId)!
                current.bestWeight = Math.max(current.bestWeight, weight)
            }
        }

        for (const [, value] of grouped) {
            const progressKg = value.bestWeight - value.firstWeight

            if (progressKg > 0) {
                results.push({
                    studentId: student.id,
                    studentName: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
                    exerciseName: value.exerciseName,
                    firstWeight: value.firstWeight,
                    bestWeight: value.bestWeight,
                    progressKg,
                })
            }
        }
    }

    return results
        .sort((a, b) => b.progressKg - a.progressKg)
        .slice(0, 5)
}
