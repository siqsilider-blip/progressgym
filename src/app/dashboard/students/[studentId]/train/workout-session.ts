import { createClient } from '@/lib/supabase/server'

export async function startWorkoutSession(payload: {
    studentId: string
    trainerId: string
    routineDayId: string
    performedDate?: string
}): Promise<{ sessionId: string | null; resumed: boolean; justCompleted: boolean }> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { sessionId: null, resumed: false, justCompleted: false }
    }

    const { data, error } = await supabase.rpc('start_workout_session_safe', {
        p_student_id: payload.studentId,
        p_routine_day_id: payload.routineDayId,
        p_performed_date: payload.performedDate ?? new Date().toISOString().slice(0, 10),
    })

    const session = data?.[0]
    if (error || !session?.session_id) {
        console.error('Error creando workout_session:', error)
        return { sessionId: null, resumed: false, justCompleted: false }
    }

    return {
        sessionId: session.session_id,
        resumed: Boolean(session.resumed),
        justCompleted: Boolean(session.just_completed),
    }
}
