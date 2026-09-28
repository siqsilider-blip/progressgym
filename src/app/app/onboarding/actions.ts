'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getStudentAppContext } from '@/lib/auth/student'
import { createClient } from '@/lib/supabase/server'
import {
    ONBOARDING_EQUIPMENT,
    ONBOARDING_EXPERIENCE,
    ONBOARDING_GOALS,
    ONBOARDING_LOCATIONS,
} from '@/lib/studentOnboarding'

export type OnboardingFormState = { error: string | null }

const allowedDurations = new Set([30, 45, 60, 75, 90])

export async function saveStudentOnboarding(
    _previousState: OnboardingFormState,
    formData: FormData
): Promise<OnboardingFormState> {
    const context = await getStudentAppContext()
    if (!context?.profile.student_id) return { error: 'No encontramos tu perfil de alumno.' }

    const goals = formData.getAll('goals').map(String).filter((value) => value in ONBOARDING_GOALS)
    const experience = String(formData.get('experience') ?? '')
    const days = Number(formData.get('days'))
    const duration = Number(formData.get('duration'))
    const location = String(formData.get('location') ?? '')
    const equipment = formData.getAll('equipment').map(String).filter((value) => value in ONBOARDING_EQUIPMENT)
    const limitations = String(formData.get('limitations') ?? '').trim()
    const preferences = String(formData.get('preferences') ?? '').trim()

    if (goals.length < 1 || goals.length > 3) {
        return { error: 'Elegí entre uno y tres objetivos.' }
    }
    if (!(experience in ONBOARDING_EXPERIENCE)) {
        return { error: 'Elegí tu nivel de experiencia.' }
    }
    if (!Number.isInteger(days) || days < 1 || days > 7) {
        return { error: 'Elegí cuántos días podés entrenar.' }
    }
    if (!allowedDurations.has(duration)) {
        return { error: 'Elegí una duración aproximada.' }
    }
    if (!(location in ONBOARDING_LOCATIONS)) {
        return { error: 'Elegí dónde vas a entrenar.' }
    }
    if (limitations.length > 1000 || preferences.length > 1000) {
        return { error: 'Revisá los textos: son demasiado largos.' }
    }

    const supabase = await createClient()
    const { error } = await supabase.rpc('save_student_onboarding', {
        p_goals: goals,
        p_experience_level: experience,
        p_training_days_per_week: days,
        p_session_minutes: duration,
        p_training_location: location,
        p_available_equipment: equipment,
        p_limitations: limitations,
        p_preferences: preferences,
    })

    if (error) {
        console.error('[saveStudentOnboarding]', error)
        return {
            error: error.code === 'PGRST202' || error.code === '42P01'
                ? 'Falta habilitar la ficha inicial en la base de datos.'
                : 'No pudimos guardar la ficha. Intentá nuevamente.',
        }
    }

    revalidatePath('/app')
    revalidatePath('/app/profile')
    revalidatePath(`/dashboard/students/${context.profile.student_id}`)
    revalidatePath('/dashboard/notifications')
    redirect('/app?onboarding=completed')
}
