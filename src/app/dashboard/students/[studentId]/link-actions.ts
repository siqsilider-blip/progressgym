'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function linkStudentToUser(payload: {
    studentId: string
    email: string
}): Promise<{ ok: boolean; message: string }> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { ok: false, message: 'No autenticado' }
    }

    // Verificar que el alumno pertenece a este entrenador
    const { data: student } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('id', payload.studentId)
        .eq('trainer_id', user.id)
        .single()

    if (!student) {
        return { ok: false, message: 'Alumno no encontrado' }
    }

    // Buscar perfil del alumno por email
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, student_id')
        .eq('email', payload.email)
        .single()

    if (!profile) {
        return { ok: false, message: 'No existe una cuenta con ese email. El alumno debe registrarse primero.' }
    }

    if (profile.role !== 'student') {
        return { ok: false, message: 'Esa cuenta es de un entrenador, no de un alumno.' }
    }

    if (profile.student_id && profile.student_id !== payload.studentId) {
        return { ok: false, message: 'Esa cuenta ya está vinculada a otro alumno.' }
    }

    // Vincular
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ student_id: payload.studentId })
        .eq('id', profile.id)

    if (updateError) {
        return { ok: false, message: 'Error al vincular la cuenta.' }
    }

    revalidatePath(`/dashboard/students/${payload.studentId}`)

    return { ok: true, message: 'Cuenta vinculada correctamente.' }
}

export async function unlinkStudentFromUser(payload: {
    studentId: string
}): Promise<{ ok: boolean; message: string }> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { ok: false, message: 'No autenticado' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ student_id: null })
        .eq('student_id', payload.studentId)

    if (error) {
        return { ok: false, message: 'Error al desvincular la cuenta.' }
    }

    revalidatePath(`/dashboard/students/${payload.studentId}`)
    return { ok: true, message: 'Cuenta desvinculada.' }
}