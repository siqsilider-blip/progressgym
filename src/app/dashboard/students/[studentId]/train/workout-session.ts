import { createClient } from '@/lib/supabase/server'
import { getBuenosAiresDateString } from '@/lib/buenosAiresDate'

export async function startWorkoutSession(payload: {
    studentId: string
    trainerId: string
    routineDayId: string
    performedDate?: string
    allowCompleted?: boolean
}): Promise<{ sessionId: string | null; resumed: boolean; justCompleted: boolean }> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { sessionId: null, resumed: false, justCompleted: false }
    }

    const rpcPayload = {
        p_student_id: payload.studentId,
        p_routine_day_id: payload.routineDayId,
        p_performed_date: payload.performedDate ?? getBuenosAiresDateString(),
        p_allow_completed: payload.allowCompleted ?? false,
    }

    let { data, error } = await supabase.rpc('start_workout_session_safe', rpcPayload)

    // Una sesión cerrada automáticamente no equivale a un entrenamiento
    // terminado. Si el alumno vuelve a ese día, comienza una sesión nueva.
    const firstResult = data?.[0]
    if (!error && payload.allowCompleted && firstResult?.just_completed && firstResult.session_id) {
        const { data: completedSession } = await supabase
            .from('workout_sessions')
            .select('completed_manually')
            .eq('id', firstResult.session_id)
            .maybeSingle()

        if (completedSession?.completed_manually !== true) {
            const retry = await supabase.rpc('start_workout_session_safe', {
                ...rpcPayload,
                p_allow_completed: false,
            })
            data = retry.data
            error = retry.error
        }
    }

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
