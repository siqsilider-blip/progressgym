'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createStudent(formData: FormData) {
    const supabase = await createClient()

    // Get current trainer
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Not authenticated')
    }

    const first_name = formData.get('first_name') as string
    const last_name = formData.get('last_name') as string
    const email = formData.get('email') as string
    const active_plan = formData.get('active_plan') as string || 'active'

    const { error } = await supabase
        .from('students')
        .insert({
            trainer_id: user.id,
            first_name,
            last_name,
            email,
            active_plan
        })

    if (error) {
        console.error('Error creating student:', error)
        redirect('/dashboard/students/new?message=Failed to create student')
    }

    revalidatePath('/dashboard')
    redirect('/dashboard')
}
