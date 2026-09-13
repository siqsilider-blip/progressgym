'use server'

import { createClient } from '@/lib/supabase/server'

type AssignTemplateResult = {
    ok: boolean
    studentId?: string
    error?: string
}

export async function assignTemplateAction(formData: FormData): Promise<AssignTemplateResult> {
    const supabase = await createClient()

    const templateId = formData.get('templateId') as string
    const studentId = formData.get('studentId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { ok: false, error: 'Tu sesión venció. Volvé a iniciar sesión.' }
    }

    if (!templateId || !studentId) {
        return { ok: false, error: 'Faltan datos para asignar el template.' }
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
        return { ok: false, error: 'Template no encontrado.' }
    }

    if (!student) {
        return { ok: false, error: 'Alumno no encontrado.' }
    }

    const { error } = await supabase.rpc('assign_template_to_student', {
        p_template_id: templateId,
        p_student_id: studentId,
    })

    if (error) {
        const message = error.message.includes('no tiene ejercicios')
            ? 'Este template no tiene ejercicios. Agregá al menos uno antes de asignarlo.'
            : 'No se pudo asignar el template. Intentá nuevamente.'
        return { ok: false, error: message }
    }

    return { ok: true, studentId }
}
