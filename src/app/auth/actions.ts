'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// ─── Signup entrenador ───
export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
        redirect('/signup?message=No se pudo crear la cuenta')
    }

    if (data.user) {
        await supabase.from('profiles').insert({
            id: data.user.id,
            email,
            name: fullName,
            role: 'trainer',
        })
    }

    redirect('/dashboard')
}

// ─── Signup alumno ───
export async function signupStudent(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
        console.error('[signupStudent] Supabase error:', error)
        redirect('/signup/student?message=No se pudo crear la cuenta')
    }

    if (data.user) {
        console.log('[signupStudent] Usuario creado:', { id: data.user.id, email: data.user.email })
        await supabase.from('profiles').insert({
            id: data.user.id,
            email,
            name: fullName,
            role: 'student',
        })
    }

    redirect('/app')
}

// ─── Login entrenador ───
export async function loginTrainer(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        redirect('/login/trainer?message=Email o contraseña incorrectos')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.role === 'student') {
            await supabase.auth.signOut()
            redirect('/login/trainer?message=Esta cuenta es de alumno. Usá el login de alumno.')
        }
    }

    redirect('/dashboard')
}

// ─── Login alumno ───
export async function loginStudent(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        redirect('/login/student?message=Email o contraseña incorrectos')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.role !== 'student') {
            await supabase.auth.signOut()
            redirect('/login/student?message=Esta cuenta es de entrenador. Usá el login de entrenador.')
        }
    }

    redirect('/app')
}

// ─── Login genérico (legacy, mantiene compatibilidad) ───
export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        redirect('/login?message=Email o contraseña incorrectos')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.role === 'student') {
            redirect('/app')
        }
    }

    redirect('/dashboard')
}

// ─── Logout ───
export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

// ─── Pedir reset de contraseña (entrenador o alumno, mismo flujo) ───
export async function requestPasswordReset(formData: FormData) {
    const supabase = await createClient()
    const email = (formData.get('email') as string)?.trim()

    if (!email) {
        redirect('/forgot-password?message=Ingresá tu email')
    }

    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = host?.includes('localhost') ? 'http' : 'https'
    const origin = `${protocol}://${host}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/confirm?next=/reset-password`,
    })

    // Por seguridad, no confirmamos si el email existe o no.
    // Siempre mostramos el mismo mensaje de éxito.
    if (error) {
        console.error('[requestPasswordReset] error:', error)
    }

    redirect('/forgot-password?sent=1')
}

// ─── Actualizar contraseña (después de clickear el link del mail) ───
export async function updatePassword(formData: FormData) {
    const supabase = await createClient()

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!password || password.length < 6) {
        redirect('/reset-password?message=La contraseña debe tener al menos 6 caracteres')
    }

    if (password !== confirmPassword) {
        redirect('/reset-password?message=Las contraseñas no coinciden')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/forgot-password?message=El link expiró. Pedí uno nuevo.')
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
        console.error('[updatePassword] error:', error)
        redirect('/reset-password?message=No se pudo actualizar la contraseña')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role === 'student') {
        redirect('/app?message=Contraseña actualizada')
    }

    redirect('/dashboard?message=Contraseña actualizada')
}