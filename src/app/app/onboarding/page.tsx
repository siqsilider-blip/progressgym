import { redirect } from 'next/navigation'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import { getStudentAppContext } from '@/lib/auth/student'
import { createClient } from '@/lib/supabase/server'
import type { StudentOnboardingProfile } from '@/lib/studentOnboarding'
import OnboardingForm from './OnboardingForm'

function isMissingPreferredWeekdays(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
    if (!error || (error.code !== '42703' && error.code !== 'PGRST204')) return false
    return [error.message, error.details, error.hint]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes('preferred_training_weekdays')
}

export default async function StudentOnboardingPage() {
    const context = await getStudentAppContext()
    if (!context?.profile.student_id) redirect('/app')

    const supabase = await createClient()
    const result = await supabase
        .from('student_onboarding_profiles')
        .select('student_id, goals, experience_level, training_days_per_week, preferred_training_weekdays, session_minutes, training_location, available_equipment, limitations, preferences, completed_at')
        .eq('student_id', context.profile.student_id)
        .maybeSingle()

    let profile = (result.data as StudentOnboardingProfile | null) ?? null

    // Mantiene accesible la ficha mientras se aplica la migración en Supabase.
    // No inventa días: los perfiles antiguos quedan pendientes de confirmación.
    if (isMissingPreferredWeekdays(result.error)) {
        const legacyResult = await supabase
            .from('student_onboarding_profiles')
            .select('student_id, goals, experience_level, training_days_per_week, session_minutes, training_location, available_equipment, limitations, preferences, completed_at')
            .eq('student_id', context.profile.student_id)
            .maybeSingle()

        profile = legacyResult.data
            ? {
                ...(legacyResult.data as Omit<StudentOnboardingProfile, 'preferred_training_weekdays'>),
                preferred_training_weekdays: null,
            }
            : null
    }

    return (
        <main className="mx-auto max-w-lg space-y-4 px-4 pb-28 pt-5">
            <StudentPageHeader
                title={profile ? 'Mi ficha inicial' : 'Contanos sobre vos'}
                subtitle={profile ? 'Actualizá tus objetivos y disponibilidad' : 'Son preguntas simples para adaptar mejor tu rutina'}
                back={Boolean(profile)}
            />
            {!profile && (
                <div className="rounded-2xl border border-primary/25 bg-primary/10 p-3.5 text-xs leading-5 text-brand-soft">
                    Te va a llevar menos de dos minutos. No necesitás conocer términos de entrenamiento.
                </div>
            )}
            <OnboardingForm profile={profile} />
        </main>
    )
}
