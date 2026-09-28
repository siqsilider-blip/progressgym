'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'
import { getBuenosAiresDateString, getCurrentBuenosAiresWeek } from '@/lib/buenosAiresDate'

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

export type WeeklyCheckinPayload = {
    energy: number
    sleepQuality: number
    stress: number
    trainingDifficulty: number
    hadPain: boolean
    painDetails: string
    bodyWeight: string
    waistCm: string
    comment: string
}

export async function saveWeeklyCheckin(
    payload: WeeklyCheckinPayload
): Promise<{ ok: boolean; error: string | null; checkinId?: string }> {
    const user = await getServerUser()
    if (!user) return { ok: false, error: 'No autenticado.' }

    const scores = [payload.energy, payload.sleepQuality, payload.stress, payload.trainingDifficulty]
        .map(Number)
    if (scores.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) {
        return { ok: false, error: 'Completá las cuatro preguntas del control.' }
    }
    if (payload.hadPain && !payload.painDetails.trim()) {
        return { ok: false, error: 'Contanos dónde sentiste la molestia.' }
    }

    const bodyWeight = parseOptionalNumber(payload.bodyWeight)
    const waistCm = parseOptionalNumber(payload.waistCm)
    if (bodyWeight === undefined || waistCm === undefined) {
        return { ok: false, error: 'Revisá las medidas ingresadas.' }
    }
    if (bodyWeight !== null && (bodyWeight < 20 || bodyWeight > 400)) {
        return { ok: false, error: 'El peso ingresado no parece válido.' }
    }
    if (waistCm !== null && (waistCm < 30 || waistCm > 300)) {
        return { ok: false, error: 'La medida de cintura no parece válida.' }
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, student_id')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role !== 'student' || !profile.student_id) {
        return { ok: false, error: 'Este control es para alumnos.' }
    }

    const { weekStart } = getCurrentBuenosAiresWeek()
    const { data: checkinId, error } = await supabase.rpc('upsert_weekly_checkin', {
        p_week_start: weekStart,
        p_energy: scores[0],
        p_sleep_quality: scores[1],
        p_stress: scores[2],
        p_training_difficulty: scores[3],
        p_had_pain: payload.hadPain,
        p_pain_details: payload.hadPain ? payload.painDetails.trim() : null,
        p_body_weight: bodyWeight,
        p_waist_cm: waistCm,
        p_comment: payload.comment.trim() || null,
    })

    if (error) {
        console.error('[saveWeeklyCheckin]', error)
        return {
            ok: false,
            error: error.code === 'PGRST205' || error.code === '42P01'
                ? 'Falta aplicar la migración del control semanal.'
                : 'No pudimos guardar el control semanal.',
        }
    }

    revalidatePath('/app')
    revalidatePath('/app/check-in')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/messages')
    return { ok: true, error: null, checkinId: typeof checkinId === 'string' ? checkinId : undefined }
}

export async function registerProgressPhoto(payload: {
    checkinId: string
    storagePath: string
    pose: 'front' | 'side' | 'back'
    marketingConsent: boolean
}): Promise<{ ok: boolean; error: string | null; photoId?: string }> {
    const user = await getServerUser()
    if (!user) return { ok: false, error: 'No autenticado.' }
    if (!payload.storagePath.startsWith(`${user.id}/`)) {
        return { ok: false, error: 'La ruta de la imagen no es válida.' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('register_progress_photo', {
        p_weekly_checkin_id: payload.checkinId,
        p_storage_path: payload.storagePath,
        p_captured_on: getBuenosAiresDateString(),
        p_pose: payload.pose,
        p_marketing_consent: payload.marketingConsent,
    })

    if (error || typeof data !== 'string') {
        console.error('[registerProgressPhoto]', error)
        return {
            ok: false,
            error: error?.code === 'PGRST202' || error?.code === '42P01'
                ? 'Falta aplicar la migración de fotos de progreso.'
                : 'No pudimos vincular la foto al control.',
        }
    }

    revalidatePath('/app/check-in')
    revalidatePath('/app/progress')
    revalidatePath('/dashboard')
    return { ok: true, error: null, photoId: data }
}

export async function setProgressPhotoMarketingConsent(
    photoId: string,
    allowed: boolean
): Promise<{ ok: boolean; error: string | null }> {
    const user = await getServerUser()
    if (!user || !photoId) return { ok: false, error: 'No autenticado.' }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('set_progress_photo_marketing_consent', {
        p_photo_id: photoId,
        p_allowed: allowed,
    })
    if (error || data !== true) {
        console.error('[setProgressPhotoMarketingConsent]', error)
        return { ok: false, error: 'No pudimos actualizar el permiso.' }
    }

    revalidatePath('/app/progress')
    revalidatePath('/app/check-in')
    return { ok: true, error: null }
}

export async function deleteProgressPhoto(
    photoId: string
): Promise<{ ok: boolean; error: string | null }> {
    const user = await getServerUser()
    if (!user || !photoId) return { ok: false, error: 'No autenticado.' }

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('id', user.id)
        .maybeSingle()
    if (!profile?.student_id) return { ok: false, error: 'Alumno no encontrado.' }

    const { data: photo } = await supabase
        .from('student_progress_photos')
        .select('storage_path')
        .eq('id', photoId)
        .eq('student_id', profile.student_id)
        .maybeSingle()
    if (!photo?.storage_path) return { ok: false, error: 'Foto no encontrada.' }

    const { error: storageError } = await supabase.storage
        .from('progress-photos')
        .remove([photo.storage_path])
    if (storageError) {
        console.error('[deleteProgressPhoto] storage:', storageError)
        return { ok: false, error: 'No pudimos eliminar el archivo.' }
    }

    const { data, error } = await supabase.rpc('delete_progress_photo_record', {
        p_photo_id: photoId,
    })
    if (error || data !== true) {
        console.error('[deleteProgressPhoto] record:', error)
        return { ok: false, error: 'La imagen se eliminó, pero no pudimos actualizar la galería.' }
    }

    revalidatePath('/app/progress')
    revalidatePath('/app/check-in')
    revalidatePath(`/dashboard/students/${profile.student_id}`)
    return { ok: true, error: null }
}

export async function getProgressPhotoComparisonExport(
    beforeId: string,
    afterId: string
): Promise<{
    ok: boolean
    error: string | null
    photos?: { id: string; url: string; capturedOn: string }[]
}> {
    const user = await getServerUser()
    if (!user || !beforeId || !afterId || beforeId === afterId) {
        return { ok: false, error: 'Selección de fotos inválida.' }
    }

    const supabase = await createClient()
    const { data: photos, error } = await supabase
        .from('student_progress_photos')
        .select('id, storage_path, captured_on')
        .eq('trainer_id', user.id)
        .eq('marketing_consent', true)
        .in('id', [beforeId, afterId])

    if (error || !photos || photos.length !== 2) {
        return { ok: false, error: 'Una de las fotos ya no tiene autorización para redes.' }
    }

    const signedPhotos = (await Promise.all(photos.map(async (photo) => {
        const { data: signed } = await supabase.storage
            .from('progress-photos')
            .createSignedUrl(photo.storage_path, 300)
        return signed?.signedUrl
            ? { id: photo.id, url: signed.signedUrl, capturedOn: photo.captured_on }
            : null
    }))).filter((photo): photo is { id: string; url: string; capturedOn: string } => photo !== null)

    if (signedPhotos.length !== 2) {
        return { ok: false, error: 'No pudimos preparar las imágenes privadas.' }
    }
    return { ok: true, error: null, photos: signedPhotos }
}

export async function markWeeklyCheckinReviewed(
    checkinId: string
): Promise<{ ok: boolean; error: string | null }> {
    const user = await getServerUser()
    if (!user || !checkinId) return { ok: false, error: 'No autenticado.' }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('mark_weekly_checkin_reviewed', {
        p_checkin_id: checkinId,
    })

    if (error || data !== true) {
        console.error('[markWeeklyCheckinReviewed]', error)
        return { ok: false, error: 'No pudimos marcar el control como revisado.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/messages')
    return { ok: true, error: null }
}

function parseOptionalNumber(value: string) {
    const normalized = value.trim().replace(',', '.')
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
}
