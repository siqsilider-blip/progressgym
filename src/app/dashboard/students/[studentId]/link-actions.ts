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

    const searchEmail = payload.email.trim().toLowerCase()

    // 1. Buscar en auth.users por email vía admin, trayendo todas las
    //    páginas. No logueamos listas de emails ni PII: solo si se
    //    encontró o no, y errores técnicos sin datos personales.
    let foundUser: { id: string; email?: string; user_metadata?: any } | undefined
    let page = 1
    const perPage = 200

    while (!foundUser) {
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
        })

        if (listError) {
            console.error('[linkStudent] error listando usuarios:', listError.message)
            return { ok: false, message: 'Error al buscar la cuenta.' }
        }

        const users = authUsers?.users ?? []

        foundUser = users.find(
            (u) => u.email?.trim().toLowerCase() === searchEmail
        )

        if (!foundUser && users.length < perPage) break

        page++
    }

    if (!foundUser) {
        return { ok: false, message: 'No existe una cuenta con ese email.' }
    }

    // 2. ANTES de tocar el profile de foundUser, verificar el OTRO lado de
    //    la relación: ¿este alumno ya tiene alguna cuenta vinculada (sea
    //    cual sea)? Sin esto, un alumno podría terminar con dos cuentas
    //    distintas apuntándole si nunca se chequea desde este ángulo.
    const { data: profilesLinkedToStudent, error: profilesLinkedError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('student_id', payload.studentId)

    if (profilesLinkedError) {
        console.error('[linkStudent] error verificando vínculos del alumno:', profilesLinkedError.message)
        return { ok: false, message: 'Error al verificar el estado del alumno.' }
    }

    if (profilesLinkedToStudent && profilesLinkedToStudent.length > 1) {
        console.error(
            '[linkStudent] integridad: más de una cuenta vinculada al mismo student_id',
            payload.studentId,
            profilesLinkedToStudent.map((p) => p.id)
        )
        return {
            ok: false,
            message: 'Este alumno tiene más de una cuenta vinculada. Contactá soporte técnico antes de continuar.',
        }
    }

    if (profilesLinkedToStudent && profilesLinkedToStudent.length === 1) {
        const alreadyLinked = profilesLinkedToStudent[0]

        if (alreadyLinked.id === foundUser.id) {
            // Ya está vinculado exactamente a esta cuenta -> idempotente.
            return { ok: true, message: 'Cuenta ya vinculada correctamente.' }
        }

        // Vinculado a OTRA cuenta -> rechazar, no tocar nada.
        return { ok: false, message: 'Este alumno ya tiene otra cuenta vinculada.' }
    }

    // A partir de acá: confirmado que ninguna cuenta está vinculada todavía
    // a este alumno. Nota: como no hay (todavía) un UNIQUE constraint sobre
    // profiles.student_id, esto es un chequeo a nivel de aplicación, no una
    // garantía absoluta ante una carrera de dos requests simultáneos -- por
    // eso check_profiles_student_id_integrity.sql existe, para evaluar
    // agregar esa constraint como defensa de base de datos más adelante.

    // 3. Buscar el profile existente de foundUser (si lo hay). Nunca
    //    hacemos upsert a ciegas sobre role/student_id.
    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
        .from('profiles')
        .select('id, role, student_id')
        .eq('id', foundUser.id)
        .maybeSingle()

    if (existingProfileError) {
        console.error('[linkStudent] error leyendo profile existente:', existingProfileError.message)
        return { ok: false, message: 'Error al verificar la cuenta.' }
    }

    // ── CASO A: no existe profile todavía → creación controlada ──
    if (!existingProfile) {
        const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: foundUser.id,
                email: foundUser.email,
                role: 'student',
                name: foundUser.user_metadata?.name ?? '',
                student_id: payload.studentId,
            })

        if (insertError) {
            console.error('[linkStudent] error creando profile:', insertError.message)
            return { ok: false, message: 'Error al crear el perfil.' }
        }

        revalidatePath(`/dashboard/students/${payload.studentId}`)
        return { ok: true, message: 'Cuenta vinculada correctamente.' }
    }

    // ── CASO E: la cuenta es de un entrenador → nunca convertir a alumno ──
    if (existingProfile.role === 'trainer') {
        return {
            ok: false,
            message: 'Esa cuenta pertenece a un entrenador y no puede vincularse como alumno.',
        }
    }

    // ── CASO F: cualquier role que no sea exactamente 'student' ──
    // (no reparamos automáticamente un estado inesperado)
    if (existingProfile.role !== 'student') {
        console.error('[linkStudent] role inesperado en profile existente:', existingProfile.id)
        return { ok: false, message: 'No se pudo vincular la cuenta (estado inesperado).' }
    }

    // A partir de acá: existingProfile.role === 'student'.

    // ── CASO D: esta cuenta ya está vinculada a OTRO alumno ──
    // (si estuviera vinculada a payload.studentId, ya habríamos vuelto en
    // el paso 2 de arriba -- por eso acá alcanza con chequear "no nulo")
    if (existingProfile.student_id !== null) {
        return { ok: false, message: 'Esta cuenta ya está vinculada a otro alumno.' }
    }

    // ── CASO B: profile de student sin vincular todavía → vincular ──
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ student_id: payload.studentId })
        .eq('id', foundUser.id)

    if (updateError) {
        console.error('[linkStudent] error vinculando:', updateError.message)
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

    // ── Autorización explícita con el cliente normal (sujeto a RLS real) ──
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('id', payload.studentId)
        .eq('trainer_id', user.id)
        .single()

    if (studentError || !student) {
        return { ok: false, message: 'Alumno no encontrado.' }
    }

    // ── Buscar TODOS los profiles que apunten a este student_id ──
    // (vía admin, para poder distinguir 0 / 1 / más de uno antes de
    // escribir nada — nunca hacemos un update masivo a ciegas)
    const { data: linkedProfiles, error: linkedProfilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, role, student_id')
        .eq('student_id', payload.studentId)

    if (linkedProfilesError) {
        console.error('[unlinkStudent] error buscando profiles vinculados:', linkedProfilesError.message)
        return { ok: false, message: 'Error al verificar la cuenta vinculada.' }
    }

    // Ninguno vinculado: ya está desvinculado, no es un error.
    if (!linkedProfiles || linkedProfiles.length === 0) {
        revalidatePath(`/dashboard/students/${payload.studentId}`)
        return { ok: true, message: 'Esta cuenta ya estaba desvinculada.' }
    }

    // Más de uno: problema de integridad de datos. No tocar nada
    // automáticamente — requiere revisión manual.
    if (linkedProfiles.length > 1) {
        console.error(
            '[unlinkStudent] integridad: más de un profile con el mismo student_id',
            payload.studentId,
            linkedProfiles.map((p) => p.id)
        )
        return {
            ok: false,
            message: 'Hay más de una cuenta vinculada a este alumno. Contactá soporte técnico antes de continuar.',
        }
    }

    const target = linkedProfiles[0]

    if (target.role !== 'student') {
        console.error('[unlinkStudent] profile vinculado con role inesperado:', target.id, target.role)
        return { ok: false, message: 'No se pudo desvincular (estado inesperado).' }
    }

    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ student_id: null })
        .eq('id', target.id)

    if (updateError) {
        console.error('[unlinkStudent] error desvinculando:', updateError.message)
        return { ok: false, message: 'Error al desvincular la cuenta.' }
    }

    revalidatePath(`/dashboard/students/${payload.studentId}`)
    return { ok: true, message: 'Cuenta desvinculada.' }
}