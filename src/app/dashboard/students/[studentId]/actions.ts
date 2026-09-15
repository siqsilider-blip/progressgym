'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function deleteStudent(formData: FormData) {
    const supabase = await createClient()
    const studentId = formData.get('studentId') as string

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('trainer_id', user.id)
        .single()

    if (!student) redirect('/dashboard/students')

    await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('trainer_id', user.id)

    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard')
    redirect('/dashboard/students')
}

export async function saveStudentNote(
    studentId: string,
    prevState: { error?: string; success?: boolean } | null,
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

export async function updateProgramStartDate(formData: FormData): Promise<{
    ok: boolean
    error?: string
}> {
    const supabase = await createClient()
    const studentId = String(formData.get('studentId') ?? '')
    const programStartedOn = String(formData.get('programStartedOn') ?? '')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Tu sesión venció. Volvé a iniciar sesión.' }

    if (!studentId || !/^\d{4}-\d{2}-\d{2}$/.test(programStartedOn)) {
        return { ok: false, error: 'Elegí una fecha válida.' }
    }

    const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('trainer_id', user.id)
        .maybeSingle()

    if (!student) return { ok: false, error: 'Alumno no encontrado.' }

    const { data: assignment, error } = await supabase
        .from('student_routines')
        .update({ program_started_on: programStartedOn })
        .eq('student_id', studentId)
        .eq('status', 'active')
        .select('id')
        .maybeSingle()

    if (error || !assignment) {
        return { ok: false, error: 'No se pudo actualizar el inicio del programa.' }
    }

    revalidatePath(`/dashboard/students/${studentId}`)
    revalidatePath(`/dashboard/students/${studentId}/train`)
    revalidatePath('/app')
    revalidatePath('/app/rutina')

    return { ok: true }
}
