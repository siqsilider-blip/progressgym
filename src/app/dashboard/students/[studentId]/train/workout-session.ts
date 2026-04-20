import { createClient } from '@/lib/supabase/server'

export async function startWorkoutSession(payload: {
    studentId: string
    trainerId: string
    routineDayId: string
    performedDate?: string
}): Promise<{ sessionId: string | null; resumed: boolean }> {
    const supabase = await createClient()

    const { data: existingSession } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('student_id', payload.studentId)
        .eq('trainer_id', payload.trainerId)
        .eq('routine_day_id', payload.routineDayId)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (existingSession?.id) {
        return { sessionId: existingSession.id, resumed: true }
    }

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
        return { sessionId: null, resumed: false }
    }

    return { sessionId: session.id, resumed: false }
}