import { redirect } from 'next/navigation'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import { getStudentAppContext } from '@/lib/auth/student'
import { createClient } from '@/lib/supabase/server'
import type { StudentOnboardingProfile } from '@/lib/studentOnboarding'
import OnboardingForm from './OnboardingForm'

export default async function StudentOnboardingPage() {
    const context = await getStudentAppContext()
    if (!context?.profile.student_id) redirect('/app')

    const supabase = await createClient()
    const { data } = await supabase
        .from('student_onboarding_profiles')
        .select('student_id, goals, experience_level, training_days_per_week, session_minutes, training_location, available_equipment, limitations, preferences, completed_at')
        .eq('student_id', context.profile.student_id)
        .maybeSingle()

    const profile = (data as StudentOnboardingProfile | null) ?? null

    return (
        <main className="mx-auto max-w-lg space-y-4 px-4 pb-28 pt-5">
            <StudentPageHeader
                title={profile ? 'Mi ficha inicial' : 'Contanos sobre vos'}
                subtitle={profile ? 'Actualizá tus objetivos y disponibilidad' : 'Son preguntas simples para adaptar mejor tu rutina'}
                back={Boolean(profile)}
            />
            {!profile && (
                <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-3.5 text-xs leading-5 text-indigo-200">
                    Te va a llevar menos de dos minutos. No necesitás conocer términos de entrenamiento.
                </div>
            )}
            <OnboardingForm profile={profile} />
        </main>
    )
}
