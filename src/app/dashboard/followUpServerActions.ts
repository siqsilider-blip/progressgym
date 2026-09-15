'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TrainerAlert } from './getTrainerAlerts'

const ALERT_TYPES: TrainerAlert['type'][] = [
    'inactive',
    'no_routine',
    'new_student',
    'unfinished_session',
    'program_ending',
]

type FollowUpAction = 'whatsapp_opened' | 'snoozed'

export async function recordStudentFollowUp({
    studentId,
    alertType,
    action,
}: {
    studentId: string
    alertType: TrainerAlert['type']
    action: FollowUpAction
}): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { ok: false, error: 'Tu sesión venció.' }
    if (!studentId || !ALERT_TYPES.includes(alertType)) {
        return { ok: false, error: 'Seguimiento inválido.' }
    }

    const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('trainer_id', user.id)
        .maybeSingle()

    if (!student) return { ok: false, error: 'Alumno no encontrado.' }

    const snoozedUntil = new Date()
    snoozedUntil.setDate(snoozedUntil.getDate() + (action === 'snoozed' ? 3 : 2))

    const { error } = await supabase.from('student_follow_ups').insert({
        trainer_id: user.id,
        student_id: studentId,
        alert_type: alertType,
        action,
        snoozed_until: snoozedUntil.toISOString(),
    })

    if (error) return { ok: false, error: 'No se pudo registrar el seguimiento.' }

    revalidatePath('/dashboard')
    return { ok: true }
}
