'use server'

import { redirect } from 'next/navigation'
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
        redirect('/signup/student?message=No se pudo crear la cuenta')
    }

    if (data.user) {
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

    // Verificar que sea trainer
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

    // Verificar que sea student
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