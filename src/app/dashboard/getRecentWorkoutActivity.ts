import { createClient } from '@/lib/supabase/server'

export type RecentWorkoutActivityItem = {
    studentId: string
    studentName: string
    exerciseName: string
    weight: number
    reps: number | null
    performedAt: string | null
}

export async function getRecentWorkoutActivity(): Promise<
    RecentWorkoutActivityItem[]
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
        .limit(10)

    if (!logs || logs.length === 0) return []

    const routineDayExerciseIds = Array.from(
        new Set(logs.map((l) => l.routine_day_exercise_id).filter(Boolean))
    )

    const { data: rde } = await supabase
        .from('routine_day_exercises')
        .select('id, exercise_id')
        .in('id', routineDayExerciseIds)

    const exerciseIds = Array.from(
        new Set(rde?.map((r) => r.exercise_id).filter(Boolean))
    )

    const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds)

    const rdeToExercise = new Map<string, string>()
    rde?.forEach((r) => {
        if (r.id && r.exercise_id) {
            rdeToExercise.set(r.id, r.exercise_id)
        }
    })

    const exerciseMap = new Map<string, string>()
    exercises?.forEach((e) => {
        if (e.id) {
            exerciseMap.set(e.id, e.name ?? 'Ejercicio')
        }
    })

    const studentMap = new Map<string, string>()
    students.forEach((s) => {
        studentMap.set(
            s.id,
            `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
        )
    })

    return logs.map((log) => {
        const exerciseId = rdeToExercise.get(log.routine_day_exercise_id)
        return {
            studentId: log.student_id,
            studentName: studentMap.get(log.student_id) ?? 'Alumno',
            exerciseName: exerciseMap.get(exerciseId ?? '') ?? 'Ejercicio',
            weight: Number(log.weight),
            reps: log.reps,
            performedAt: log.performed_at,
        }
    })
}