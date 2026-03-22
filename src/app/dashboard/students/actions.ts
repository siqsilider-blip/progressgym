'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createStudent(formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const firstName = String(formData.get('first_name') ?? '').trim()
    const lastName = String(formData.get('last_name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const activePlan = String(formData.get('active_plan') ?? 'active').trim()

    if (!firstName || !lastName) {
        redirect('/dashboard/students/new?message=Completá nombre y apellido')
    }

    const { data, error } = await supabase
        .from('students')
        .insert({
            trainer_id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: email || null,
            active_plan: activePlan || 'active',
        })
        .select('id')
        .single()

    if (error || !data) {
        const message = encodeURIComponent(
            error?.message || 'No se pudo crear el alumno'
        )
        redirect(`/dashboard/students/new?message=${message}`)
    }

    redirect(`/dashboard/students/${data.id}`)
}