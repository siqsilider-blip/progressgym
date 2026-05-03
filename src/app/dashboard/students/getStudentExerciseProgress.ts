import { createClient } from '@/lib/supabase/server'

export type ExerciseProgress = {
    exerciseId: string
    exerciseName: string
    firstWeight: number
    bestWeight: number
    lastWeight: number
    progressKg: number
    progressPercent: number
    totalSessions: number
    logs: { date: string; weight: number }[]
}

export async function getStudentExerciseProgress(
    studentId: string
): Promise<ExerciseProgress[]> {
    const supabase = await createClient()

    const { data: logs } = await supabase
        .from('exercise_logs')
        .select('routine_day_exercise_id, weight, performed_at, created_at')
        .eq('student_id', studentId)
        .not('weight', 'is', null)
        .not('weight', 'eq', 0)
        .order('performed_at', { ascending: true })

    if (!logs || logs.length === 0) return []

    const rdeIds = [...new Set(logs.map(l => l.routine_day_exercise_id).filter(Boolean))]

    const { data: rdes } = await supabase
        .from('routine_day_exercises')
        .select('id, exercise_id')
        .in('id', rdeIds)

    const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', [...new Set((rdes ?? []).map(r => r.exercise_id).filter(Boolean))])

    const rdeToExercise = new Map<string, string>()
    for (const r of rdes ?? []) {
        if (r.id && r.exercise_id) rdeToExercise.set(r.id, r.exercise_id)
    }

    const exerciseIdToName = new Map<string, string>()
    for (const e of exercises ?? []) {
        if (e.id) exerciseIdToName.set(e.id, e.name ?? 'Ejercicio')
    }

    const grouped = new Map<string, {
        name: string
        logsByDate: Map<string, number>
        totalCount: number
        absoluteFirstWeight: number
    }>()

    for (const log of logs) {
        if (!log.routine_day_exercise_id || log.weight == null) continue
        const exerciseId = rdeToExercise.get(log.routine_day_exercise_id)
        if (!exerciseId) continue
        const name = exerciseIdToName.get(exerciseId) ?? 'Ejercicio'
        const rawDate = log.performed_at ?? log.created_at
        if (!rawDate) continue
        const date = String(rawDate).split('T')[0]
        const weight = Number(log.weight)

        if (!grouped.has(exerciseId)) {
            grouped.set(exerciseId, { name, logsByDate: new Map(), totalCount: 0, absoluteFirstWeight: weight })
        }
        const group = grouped.get(exerciseId)!
        group.totalCount++
        const existing = group.logsByDate.get(date) ?? 0
        if (weight > existing) group.logsByDate.set(date, weight)
    }

    const result: ExerciseProgress[] = []

    for (const [exerciseId, { name, logsByDate, absoluteFirstWeight }] of grouped) {
        if (logsByDate.size === 0) continue

        const sortedLogs = [...logsByDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, weight]) => ({ date, weight }))

        const bestWeight = Math.max(...sortedLogs.map(l => l.weight))
        const firstWeight = absoluteFirstWeight
        const lastWeight = sortedLogs[sortedLogs.length - 1].weight
        const progressKg = bestWeight - firstWeight
        const progressPercent = firstWeight > 0
            ? Math.round((progressKg / firstWeight) * 100)
            : 0

        result.push({
            exerciseId,
            exerciseName: name,
            firstWeight,
            bestWeight,
            lastWeight,
            progressKg,
            progressPercent,
            totalSessions: sortedLogs.length,
            logs: sortedLogs.slice(-12),
        })
    }

    return result.sort((a, b) => b.progressKg - a.progressKg)
}
