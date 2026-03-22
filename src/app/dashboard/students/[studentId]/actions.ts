'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveStudentNote(
    studentId: string,
    prevState: any,
    formData: FormData
) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const note = String(formData.get('note') ?? '').trim()

    if (!note) {
        return { error: 'La nota no puede estar vacía' }
    }

    const { error } = await supabase.from('student_notes').upsert(
        {
            student_id: studentId,
            trainer_id: user.id,
            note,
        },
        {
            onConflict: 'student_id,trainer_id',
        }
    )

    if (error) {
        return { error: 'Error al guardar la nota' }
    }

    return { success: true }
}