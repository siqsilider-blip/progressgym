import { createClient } from '@/lib/supabase/server'

export type WeeklyVolume = {
    muscle: string
    sets: number
}

export async function getStudentWeeklyVolume(
    studentId: string
): Promise<WeeklyVolume[]> {
    const supabase = await createClient()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // 1️⃣ Traer logs de ejercicios de la semana
    const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select(`
      routine_day_exercise_id,
      routine_day_exercises (
        exercise_name
      )
    `)
        .eq('student_id', studentId)
        .gte('created_at', sevenDaysAgo.toISOString())

    if (error || !logs) {
        console.error('Error fetching weekly volume:', error)
        return []
    }

    // 2️⃣ Traer lista de ejercicios con su músculo
    const { data: exercises } = await supabase
        .from('exercises')
        .select('name, muscle_group')

    const exerciseMap = new Map()

    for (const ex of exercises || []) {
        exerciseMap.set(ex.name, ex.muscle_group)
    }

    const volume = new Map<string, number>()

    // 3️⃣ Calcular volumen
    for (const log of logs as any[]) {
        const exerciseName =
            log.routine_day_exercises?.exercise_name || ''

        let muscle = exerciseMap.get(exerciseName) || 'otros'

        muscle = muscle
            .toLowerCase()
            .replace('ú', 'u')
            .replace('ó', 'o')
            .replace('í', 'i')
            .replace('é', 'e')
            .replace('á', 'a')

        if (muscle === 'gluteos') muscle = 'glúteos'
        if (muscle === 'isquios') muscle = 'isquios'
        if (muscle === 'pecho') muscle = 'pecho'
        if (muscle === 'espalda') muscle = 'espalda'
        if (muscle === 'piernas') muscle = 'piernas'

        const current = volume.get(muscle) || 0
        volume.set(muscle, current + 1)
    }

    return Array.from(volume.entries()).map(([muscle, sets]) => ({
        muscle,
        sets,
    }))
}