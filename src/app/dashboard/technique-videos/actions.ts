'use server'

import { revalidatePath } from 'next/cache'
import { getServerUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'

type ReviewResult = {
    ok: boolean
    error: string | null
}

export async function reviewTechniqueVideo(payload: {
    submissionId: string
    feedback: string
}): Promise<ReviewResult> {
    const user = await getServerUser()
    if (!user) return { ok: false, error: 'No autenticado.' }

    const feedback = payload.feedback.trim()
    if (!payload.submissionId) {
        return { ok: false, error: 'No encontramos el video.' }
    }
    if (!feedback) {
        return { ok: false, error: 'Escribí una devolución antes de marcarlo como revisado.' }
    }
    if (feedback.length > 2000) {
        return { ok: false, error: 'La devolución no puede superar los 2000 caracteres.' }
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role !== 'trainer') {
        return { ok: false, error: 'Solo el entrenador puede revisar este video.' }
    }

    const { data, error } = await supabase.rpc('mark_technique_video_reviewed', {
        p_submission_id: payload.submissionId,
        p_feedback: feedback,
    })

    if (error || data !== true) {
        console.error('[reviewTechniqueVideo]', error)
        return {
            ok: false,
            error: error?.code === 'PGRST202' || error?.code === '42P01'
                ? 'Falta aplicar la migración de videos de técnica.'
                : 'No pudimos guardar la devolución. Intentá nuevamente.',
        }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/technique-videos')
    revalidatePath('/dashboard/messages')
    revalidatePath('/dashboard/notifications')
    revalidatePath('/app/messages')
    revalidatePath('/app')

    return { ok: true, error: null }
}
