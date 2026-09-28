'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'

export type CoachingTopic =
    | 'general'
    | 'question'
    | 'pain'
    | 'equipment'
    | 'technique'
    | 'alternative'

const COACHING_TOPICS = new Set<CoachingTopic>([
    'general',
    'question',
    'pain',
    'equipment',
    'technique',
    'alternative',
])

type ActionResult = { ok: true; conversationId: string } | { ok: false; error: string }

export async function sendCoachingMessage(payload: {
    studentId?: string
    body: string
    topic?: CoachingTopic
    routineDayExerciseId?: string | null
    workoutSessionId?: string | null
}): Promise<ActionResult> {
    const body = payload.body.trim()
    if (!body) return { ok: false, error: 'Escribí un mensaje.' }
    if (body.length > 4000) return { ok: false, error: 'El mensaje es demasiado largo.' }

    const topic = payload.topic && COACHING_TOPICS.has(payload.topic)
        ? payload.topic
        : 'general'

    const user = await getServerUser()
    if (!user) return { ok: false, error: 'No autenticado.' }

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, student_id')
        .eq('id', user.id)
        .maybeSingle()

    const senderRole = profile?.role === 'trainer'
        ? 'trainer'
        : profile?.role === 'student'
            ? 'student'
            : null

    if (!senderRole) return { ok: false, error: 'Perfil no autorizado.' }

    const studentId = senderRole === 'student' ? profile?.student_id : payload.studentId
    if (!studentId) return { ok: false, error: 'No se encontró el alumno.' }

    if (senderRole === 'trainer') {
        const { data: ownedStudent } = await supabase
            .from('students')
            .select('id')
            .eq('id', studentId)
            .eq('trainer_id', user.id)
            .maybeSingle()

        if (!ownedStudent) return { ok: false, error: 'No tenés acceso a este alumno.' }
    }

    const { data: conversationId, error: conversationError } = await supabase.rpc(
        'ensure_coaching_conversation',
        { p_student_id: studentId }
    )

    if (conversationError || !conversationId) {
        console.error('[sendCoachingMessage] conversation:', conversationError)
        return {
            ok: false,
            error: conversationError?.code === 'PGRST202'
                ? 'Falta aplicar la migración de seguimiento.'
                : 'No pudimos abrir la conversación.',
        }
    }

    const { error: insertError } = await supabase
        .from('coaching_messages')
        .insert({
            conversation_id: conversationId,
            sender_user_id: user.id,
            sender_role: senderRole,
            topic,
            body,
            routine_day_exercise_id: payload.routineDayExerciseId || null,
            workout_session_id: payload.workoutSessionId || null,
        })

    if (insertError) {
        console.error('[sendCoachingMessage] insert:', insertError)
        return { ok: false, error: 'No pudimos enviar el mensaje.' }
    }

    revalidatePath('/app/messages')
    revalidatePath('/dashboard/messages')
    revalidatePath('/dashboard')

    return { ok: true, conversationId }
}

export async function markCoachingMessagesRead(conversationId: string) {
    if (!conversationId) return
    const supabase = await createClient()
    const { error } = await supabase.rpc('mark_coaching_messages_read', {
        p_conversation_id: conversationId,
    })
    if (error) console.error('[markCoachingMessagesRead]', error)
}

export async function markNotificationTypeRead(type: string) {
    const user = await getServerUser()
    if (!user || !type) return
    const supabase = await createClient()
    const { error } = await supabase
        .from('internal_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_user_id', user.id)
        .eq('type', type)
        .is('read_at', null)
    if (error) console.error('[markNotificationTypeRead]', error)
}

export async function saveWorkoutFeedback(payload: {
    sessionId: string
    studentId: string
    energy: number | null
    difficulty: number | null
    hadPain: boolean
    painDetails: string
    comment: string
}): Promise<{ ok: boolean; error: string | null }> {
    const user = await getServerUser()
    if (!user) return { ok: false, error: 'No autenticado.' }

    const energy = payload.energy == null ? null : Number(payload.energy)
    const difficulty = payload.difficulty == null ? null : Number(payload.difficulty)
    if (energy != null && (energy < 1 || energy > 5)) {
        return { ok: false, error: 'La energía debe estar entre 1 y 5.' }
    }
    if (difficulty != null && (difficulty < 1 || difficulty > 5)) {
        return { ok: false, error: 'La dificultad debe estar entre 1 y 5.' }
    }
    if (payload.hadPain && !payload.painDetails.trim()) {
        return { ok: false, error: 'Contanos dónde sentiste la molestia.' }
    }

    const supabase = await createClient()
    const { data: session } = await supabase
        .from('workout_sessions')
        .select('id, student_id, trainer_id')
        .eq('id', payload.sessionId)
        .eq('student_id', payload.studentId)
        .maybeSingle()

    if (!session) return { ok: false, error: 'Sesión no encontrada.' }

    const { error } = await supabase
        .from('workout_feedback')
        .upsert({
            workout_session_id: session.id,
            student_id: session.student_id,
            trainer_id: session.trainer_id,
            energy,
            difficulty,
            had_pain: payload.hadPain,
            pain_details: payload.hadPain ? payload.painDetails.trim() : null,
            comment: payload.comment.trim() || null,
        }, { onConflict: 'workout_session_id' })

    if (error) {
        console.error('[saveWorkoutFeedback]', error)
        return {
            ok: false,
            error: error.code === 'PGRST205'
                ? 'Falta aplicar la migración de seguimiento.'
                : 'No pudimos guardar la evaluación.',
        }
    }

    await supabase
        .from('workout_sessions')
        .update({ notes: payload.comment.trim() || null })
        .eq('id', session.id)

    revalidatePath(`/dashboard/students/${payload.studentId}`)
    revalidatePath('/dashboard/messages')
    revalidatePath('/dashboard')
    return { ok: true, error: null }
}
