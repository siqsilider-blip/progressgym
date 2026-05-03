import { createClient } from '@/lib/supabase/server'

export async function startWorkoutSession(payload: {
    studentId: string
    trainerId: string
    routineDayId: string
    performedDate?: string
}): Promise<{ sessionId: string | null; resumed: boolean; justCompleted: boolean }> {
    const supabase = await createClient()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // 1. Buscar sesión in_progress de hoy
    const { data: existingSession } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('student_id', payload.studentId)
        .eq('trainer_id', payload.trainerId)
        .eq('routine_day_id', payload.routineDayId)
        .eq('status', 'in_progress')
        .gte('started_at', todayStart.toISOString())
        .maybeSingle()

    if (existingSession?.id) {
        return { sessionId: existingSession.id, resumed: true, justCompleted: false }
    }

    // 2. Buscar sesión completed en el último minuto (evitar recrear)
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
    const { data: recentCompleted } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('student_id', payload.studentId)
        .eq('trainer_id', payload.trainerId)
        .eq('routine_day_id', payload.routineDayId)
        .eq('status', 'completed')
        .gte('finished_at', oneMinuteAgo)
        .maybeSingle()

    if (recentCompleted?.id) {
        return { sessionId: recentCompleted.id, resumed: false, justCompleted: true }
    }

    // 3. Crear nueva sesión
    const performedDate =
        payload.performedDate ?? new Date().toISOString().slice(0, 10)

    const { data: session, error: insertError } = await supabase
        .from('workout_sessions')
        .insert({
            student_id: payload.studentId,
            trainer_id: payload.trainerId,
            routine_day_id: payload.routineDayId,
            status: 'in_progress',
            performed_date: performedDate,
            started_at: new Date().toISOString(),
        })
        .select('id')
        .single()

    if (insertError || !session) {
        console.error('Error creando workout_session:', insertError)
        return { sessionId: null, resumed: false, justCompleted: false }
    }

    return { sessionId: session.id, resumed: false, justCompleted: false }
}
