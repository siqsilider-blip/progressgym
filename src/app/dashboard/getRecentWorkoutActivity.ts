import { createClient } from '@/lib/supabase/server'
import { getRoutineExerciseNameMap } from '@/lib/coaching/getRoutineExerciseNames'
import { getTrainerStudents } from './getTrainerStudents'

export type RecentWorkoutActivityItem = {
    studentId: string
    studentName: string
    exerciseName: string
    weight: number
    reps: number | null
    performedAt: string | null
}

export async function getRecentWorkoutActivity(limit = 10): Promise<
    RecentWorkoutActivityItem[]
> {
    const supabase = await createClient()
    const students = await getTrainerStudents()
    if (students.length === 0) return []

    const studentIds = students.map((s) => s.id)

    const { data: logs } = await supabase
        .from('exercise_logs')
        .select(`
            student_id,
            weight,
            reps,
            performed_at,
            routine_day_exercise_id
        `)
        .in('student_id', studentIds)
        .not('weight', 'is', null)
        .order('performed_at', { ascending: false })
        .limit(limit)

    if (!logs || logs.length === 0) return []

    const exerciseNames = await getRoutineExerciseNameMap(
        supabase,
        logs.map((log) => log.routine_day_exercise_id)
    )

    const studentMap = new Map<string, string>()
    students.forEach((s) => {
        studentMap.set(
            s.id,
            `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
        )
    })

    return logs.map((log) => {
        return {
            studentId: log.student_id,
            studentName: studentMap.get(log.student_id) ?? 'Alumno',
            exerciseName: exerciseNames.get(log.routine_day_exercise_id) ?? 'Ejercicio',
            weight: Number(log.weight),
            reps: log.reps,
            performedAt: log.performed_at,
        }
    })
}
