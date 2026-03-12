'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveStudentNote(studentId: string, note: string) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'No autorizado' }
    }

    const { error } = await supabase
        .from('student_notes')
        .upsert(
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
        console.error('Error saving student note:', error)
        return { error: 'No se pudo guardar la nota' }
    }

    revalidatePath(`/dashboard/students/${studentId}`)

    return { success: true }
}