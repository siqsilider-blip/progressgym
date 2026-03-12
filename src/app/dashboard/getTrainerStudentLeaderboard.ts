import { createClient } from '@/lib/supabase/server'

export type TrainerStudentLeaderboardItem = {
    studentId: string
    studentName: string
    progressKg: number
    bestExerciseName: string | null
}

export async function getTrainerStudentLeaderboard(): Promise<
    TrainerStudentLeaderboardItem[]
> {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return []
    }

    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, trainer_id')
        .eq('trainer_id', user.id)

    if (studentsError || !students) {
        console.error('Error fetching students for leaderboard:', studentsError)
        return []
    }

    const results: TrainerStudentLeaderboardItem[] = []

    for (const student of students) {
        const { data: logs, error: logsError } = await supabase
            .from('exercise_logs')
            .select(`
        weight,
        created_at,
        routine_day_exercise_id
      `)
            .eq('student_id', student.id)
            .not('weight', 'is', null)
            .order('created_at', { ascending: true })

        if (logsError || !logs || logs.length === 0) {
            continue
        }

        const routineDayExerciseIds = Array.from(
            new Set(
                logs
                    .map((log) => log.routine_day_exercise_id)
                    .filter((id) => id !== null)
            )
        )

        if (routineDayExerciseIds.length === 0) {
            continue
        }

        const { data: routineDayExercises, error: rdeError } = await supabase
            .from('routine_day_exercises')
            .select('id, exercise_id')
            .in('id', routineDayExerciseIds)

        if (rdeError || !routineDayExercises) {
            console.error('Error fetching routine_day_exercises for leaderboard:', rdeError)
            continue
        }

        const exerciseIds = Array.from(
            new Set(
                routineDayExercises
                    .map((item) => item.exercise_id)
                    .filter((id) => id !== null)
            )
        )

        if (exerciseIds.length === 0) {
            continue
        }

        const { data: exercises, error: exercisesError } = await supabase
            .from('exercises')
            .select('id, name')
            .in('id', exerciseIds)

        if (exercisesError || !exercises) {
            console.error('Error fetching exercises for leaderboard:', exercisesError)
            continue
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
                firstWeight: number
                bestWeight: number
            }
        >()

        for (const log of logs as any[]) {
            const routineDayExerciseId = log.routine_day_exercise_id
            if (!routineDayExerciseId || log.weight == null) continue

            const exerciseId = routineDayExerciseToExerciseId.get(routineDayExerciseId)
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
                grouped.set(exerciseId, current)
            }
        }

        let bestProgressKg = 0
        let bestExerciseName: string | null = null

        for (const [, value] of grouped) {
            const progressKg = value.bestWeight - value.firstWeight

            if (progressKg > bestProgressKg) {
                bestProgressKg = progressKg
                bestExerciseName = value.exerciseName
            }
        }

        if (bestProgressKg > 0) {
            results.push({
                studentId: student.id,
                studentName: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
                progressKg: bestProgressKg,
                bestExerciseName,
            })
        }
    }

    return results.sort((a, b) => b.progressKg - a.progressKg).slice(0, 5)
}