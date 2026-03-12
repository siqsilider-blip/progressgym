import { createClient } from '@/lib/supabase/server'

export type GlobalPR = {
    weight: number
    reps: number | null
    performed_at: string | null
    exerciseName: string
    studentName: string
}

export async function getGlobalPRs(): Promise<GlobalPR[]> {
    const supabase = await createClient()

    const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select(`
      student_id,
      weight,
      reps,
      performed_at,
      routine_day_exercise_id
    `)
        .not('weight', 'is', null)
        .order('weight', { ascending: false })
        .limit(20)

    if (logsError || !logs) {
        console.error('Error fetching global PR logs:', logsError)
        return []
    }

    const routineDayExerciseIds = Array.from(
        new Set(
            logs
                .map((log) => log.routine_day_exercise_id)
                .filter((id) => id !== null)
        )
    )

    const studentIds = Array.from(
        new Set(
            logs
                .map((log) => log.student_id)
                .filter((id) => id !== null)
        )
    )

    if (routineDayExerciseIds.length === 0 || studentIds.length === 0) {
        return []
    }

    const { data: routineDayExercises, error: rdeError } = await supabase
        .from('routine_day_exercises')
        .select('id, exercise_id')
        .in('id', routineDayExerciseIds)

    if (rdeError || !routineDayExercises) {
        console.error('Error fetching routine_day_exercises for global PRs:', rdeError)
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
        console.error('Error fetching exercises for global PRs:', exercisesError)
        return []
    }

    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .in('id', studentIds)

    if (studentsError || !students) {
        console.error('Error fetching students for global PRs:', studentsError)
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

    const studentIdToName = new Map<string, string>()
    for (const student of students) {
        if (student.id) {
            studentIdToName.set(
                student.id,
                `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'
            )
        }
    }

    const result: GlobalPR[] = []

    for (const log of logs as any[]) {
        const exerciseId = routineDayExerciseToExerciseId.get(
            log.routine_day_exercise_id
        )

        const exerciseName = exerciseId
            ? exerciseIdToName.get(exerciseId) ?? 'Ejercicio'
            : 'Ejercicio'

        const studentName = log.student_id
            ? studentIdToName.get(log.student_id) ?? 'Alumno'
            : 'Alumno'

        result.push({
            weight: Number(log.weight ?? 0),
            reps: log.reps ?? 0,
            performed_at: log.performed_at ?? null,
            exerciseName,
            studentName,
        })
    }

    return result.slice(0, 10)
}