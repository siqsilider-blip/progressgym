'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

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

    // Normalizamos el email que llega del formulario (trim + lowercase)
    const searchEmail = payload.email.trim().toLowerCase()

    console.log('[linkStudent] email buscado (normalizado):', searchEmail)

    // 1. Buscar en auth.users por email via admin, trayendo TODAS las páginas
    //    y comparando de forma normalizada (case-insensitive, sin espacios)
    let foundUser: { id: string; email?: string; user_metadata?: any } | undefined
    let page = 1
    const perPage = 200

    while (!foundUser) {
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
        })

        if (listError) {
            console.error('[linkStudent] error listando usuarios:', listError)
            return { ok: false, message: 'Error al buscar la cuenta.' }
        }

        const users = authUsers?.users ?? []

        console.log(
            '[linkStudent] página', page, '- emails en esta página:',
            users.map(u => u.email)
        )

        foundUser = users.find(
            (u) => u.email?.trim().toLowerCase() === searchEmail
        )

        // Si no hay más páginas, cortamos el loop
        if (!foundUser && users.length < perPage) break

        page++
    }

    console.log('[linkStudent] foundUser:', foundUser?.id, foundUser?.email)

    if (!foundUser) {
        return { ok: false, message: 'No existe una cuenta con ese email.' }
    }

    // 2. Crear el perfil si no existe
    const { error: upsertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: foundUser.id,
            email: foundUser.email,
            role: 'student',
            name: foundUser.user_metadata?.name ?? '',
        }, { onConflict: 'id' })

    console.log('[linkStudent] upsert error:', upsertError)

    if (upsertError) {
        console.error('[linkStudent] error creando perfil:', upsertError)
        return { ok: false, message: 'Error al crear el perfil.' }
    }

    // 3. Actualizar student_id en el perfil
    const updateResult = await supabaseAdmin
        .from('profiles')
        .update({ student_id: payload.studentId })
        .eq('id', foundUser.id)

    console.log('[linkStudent] resultado update:', updateResult)

    if (updateResult.error) {
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