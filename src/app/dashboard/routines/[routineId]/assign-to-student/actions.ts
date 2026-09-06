'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function assignTemplateAction(formData: FormData) {
    const supabase = await createClient()

    const templateId = formData.get('templateId') as string
    const studentId = formData.get('studentId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!templateId || !studentId) {
        throw new Error('Faltan datos para asignar el template.')
    }

    // Autorización explícita de ambos lados ANTES de llamar a la RPC --
    // aunque assign_template_to_student y assign_student_routine ya validan
    // esto mismo vía RLS (SECURITY INVOKER), repetirlo acá da un mensaje de
    // error claro en vez de un error genérico de Postgres si algo no
    // corresponde a este entrenador.
    const [{ data: template }, { data: student }] = await Promise.all([
        supabase
            .from('routines')
            .select('id')
            .eq('id', templateId)
            .eq('trainer_id', user.id)
            .eq('routine_kind', 'template')
            .maybeSingle(),
        supabase
            .from('students')
            .select('id')
            .eq('id', studentId)
            .eq('trainer_id', user.id)
            .maybeSingle(),
    ])

    if (!template) {
        throw new Error('Template no encontrado.')
    }

    if (!student) {
        throw new Error('Alumno no encontrado.')
    }

    const { error } = await supabase.rpc('assign_template_to_student', {
        p_template_id: templateId,
        p_student_id: studentId,
    })

    if (error) {
        throw new Error(error.message)
    }

    redirect(`/dashboard/students/${studentId}`)
}
