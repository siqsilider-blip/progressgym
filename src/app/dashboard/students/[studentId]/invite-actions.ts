'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient, type User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

type InvitationResult =
    | {
        ok: true
        inviteUrl: string
        whatsappUrl: string | null
        message: string
        email: string
        accountWasCreated: boolean
    }
    | { ok: false; error: string }

const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    }
)

function normalizeEmail(value: string) {
    return value.trim().toLowerCase()
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function getApplicationOrigin() {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (configuredUrl) return configuredUrl.replace(/\/$/, '')

    const headerList = await headers()
    const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
    if (!host) return 'https://progressgym-sigma.vercel.app'

    const protocol = headerList.get('x-forwarded-proto')
        ?? (host.includes('localhost') ? 'http' : 'https')
    return `${protocol}://${host}`
}

async function findUserByEmail(email: string): Promise<User | null> {
    let page = 1
    const perPage = 200

    while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
        if (error) throw error

        const match = data.users.find(
            (user) => normalizeEmail(user.email ?? '') === email
        )
        if (match) return match
        if (data.users.length < perPage) return null
        page += 1
    }
}

async function linkExistingUser(params: {
    user: User
    studentId: string
    fullName: string
    email: string
}) {
    const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('id, role, student_id')
        .eq('id', params.user.id)
        .maybeSingle()

    if (profileError) throw profileError

    if (profile?.role === 'trainer') {
        return { ok: false as const, error: 'Ese email pertenece a una cuenta de entrenador.' }
    }

    if (profile?.student_id && profile.student_id !== params.studentId) {
        return { ok: false as const, error: 'Esa cuenta ya está vinculada a otro alumno.' }
    }

    const { data: profilesForStudent, error: linkedError } = await admin
        .from('profiles')
        .select('id')
        .eq('student_id', params.studentId)

    if (linkedError) throw linkedError
    if ((profilesForStudent ?? []).some((linked) => linked.id !== params.user.id)) {
        return { ok: false as const, error: 'Este alumno ya tiene otra cuenta vinculada.' }
    }

    const profilePayload = {
        email: params.email,
        name: params.fullName,
        role: 'student',
        student_id: params.studentId,
    }

    const profileResult = profile
        ? await admin.from('profiles').update(profilePayload).eq('id', params.user.id)
        : await admin.from('profiles').insert({ id: params.user.id, ...profilePayload })

    if (profileResult.error) throw profileResult.error
    return { ok: true as const }
}

export async function getStudentAccessAccount(studentId: string) {
    const identity = await getServerUser()
    if (!identity) return null

    const supabase = await createClient()
    const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('trainer_id', identity.id)
        .maybeSingle()

    if (!student) return null

    const { data: profiles, error } = await admin
        .from('profiles')
        .select('id, email')
        .eq('student_id', studentId)
        .limit(2)

    if (error || !profiles || profiles.length !== 1) return null
    return profiles[0]
}

export async function createStudentAccessInvitation(input: {
    studentId: string
    email: string
}): Promise<InvitationResult> {
    const identity = await getServerUser()
    if (!identity) return { ok: false, error: 'Tu sesión venció. Volvé a iniciar sesión.' }

    const email = normalizeEmail(input.email)
    if (!isValidEmail(email)) {
        return { ok: false, error: 'Ingresá un email válido.' }
    }

    const supabase = await createClient()
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone, email')
        .eq('id', input.studentId)
        .eq('trainer_id', identity.id)
        .maybeSingle()

    if (studentError || !student) {
        return { ok: false, error: 'No se encontró el alumno.' }
    }

    const { data: activeRoutine } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', student.id)
        .eq('status', 'active')
        .maybeSingle()

    if (!activeRoutine?.routine_id) {
        return { ok: false, error: 'Primero asignale una rutina para que no ingrese a una cuenta vacía.' }
    }

    const { data: routineDays, error: routineDaysError } = await supabase
        .from('routine_days')
        .select('id')
        .eq('routine_id', activeRoutine.routine_id)

    if (routineDaysError) {
        return { ok: false, error: 'No se pudo verificar la rutina asignada.' }
    }

    const routineDayIds = (routineDays ?? []).map((day) => day.id)
    if (routineDayIds.length === 0) {
        return { ok: false, error: 'La rutina todavía no tiene ejercicios cargados.' }
    }

    const { data: firstExercise, error: exerciseError } = await supabase
        .from('routine_day_exercises')
        .select('id')
        .in('routine_day_id', routineDayIds)
        .limit(1)
        .maybeSingle()

    if (exerciseError) {
        return { ok: false, error: 'No se pudo verificar la rutina asignada.' }
    }

    if (!firstExercise) {
        return { ok: false, error: 'Agregá al menos un ejercicio antes de invitar al alumno.' }
    }

    const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

    try {
        let authUser = await findUserByEmail(email)
        let accountWasCreated = false
        let tokenHash: string
        let verificationType: 'signup' | 'recovery'

        if (!authUser) {
            const temporaryPassword = `${randomBytes(32).toString('base64url')}Aa1!`
            const { data, error } = await admin.auth.admin.generateLink({
                type: 'signup',
                email,
                password: temporaryPassword,
                options: {
                    data: { full_name: fullName },
                },
            })

            if (error || !data.user || !data.properties.hashed_token) {
                throw error ?? new Error('No se pudo crear el acceso.')
            }

            authUser = data.user
            tokenHash = data.properties.hashed_token
            verificationType = 'signup'
            accountWasCreated = true
        } else {
            const { data, error } = await admin.auth.admin.generateLink({
                type: 'recovery',
                email,
            })

            if (error || !data.properties.hashed_token) {
                throw error ?? new Error('No se pudo renovar el acceso.')
            }

            tokenHash = data.properties.hashed_token
            verificationType = 'recovery'
        }

        const linked = await linkExistingUser({
            user: authUser,
            studentId: student.id,
            fullName,
            email,
        })

        if (!linked.ok) {
            if (accountWasCreated) await admin.auth.admin.deleteUser(authUser.id)
            return linked
        }

        if (student.email !== email) {
            const { error: updateStudentError } = await supabase
                .from('students')
                .update({ email })
                .eq('id', student.id)
                .eq('trainer_id', identity.id)

            if (updateStudentError) throw updateStudentError
        }

        const origin = await getApplicationOrigin()
        const confirmParams = new URLSearchParams({
            token_hash: tokenHash,
            type: verificationType,
            next: '/reset-password?invite=1',
        })
        const inviteUrl = `${origin}/auth/confirm?${confirmParams.toString()}`
        const message = [
            `Hola ${student.first_name ?? ''} 👋`,
            'Te envío el acceso a Progrezzia para que puedas ver tu rutina y registrar tus entrenamientos.',
            'Abrí este enlace y elegí tu contraseña:',
            inviteUrl,
        ].join('\n\n')

        revalidatePath(`/dashboard/students/${student.id}`)

        return {
            ok: true,
            inviteUrl,
            whatsappUrl: student.phone ? buildWhatsAppUrl(student.phone, message) : null,
            message,
            email,
            accountWasCreated,
        }
    } catch (error) {
        console.error('[createStudentAccessInvitation] error:', error)
        return { ok: false, error: 'No se pudo preparar la invitación. Intentá nuevamente.' }
    }
}
