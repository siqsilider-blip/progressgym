import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentAppContext } from '@/lib/auth/student'
import { getCurrentBuenosAiresWeek } from '@/lib/buenosAiresDate'
import WeeklyCheckinForm from '@/components/coaching/WeeklyCheckinForm'

type WeeklyCheckinRow = {
    energy: number
    sleep_quality: number
    stress: number
    training_difficulty: number
    had_pain: boolean
    pain_details: string | null
    body_weight: number | null
    waist_cm: number | null
    comment: string | null
}

export default async function WeeklyCheckinPage() {
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    if (!context.profile.student_id) redirect('/app')

    const supabase = await createClient()
    const { weekStart } = getCurrentBuenosAiresWeek()
    const [{ data }, { data: student }] = await Promise.all([
        supabase
            .from('student_weekly_checkins')
            .select('energy, sleep_quality, stress, training_difficulty, had_pain, pain_details, body_weight, waist_cm, comment')
            .eq('student_id', context.profile.student_id)
            .eq('week_start', weekStart)
            .maybeSingle(),
        supabase
            .from('students')
            .select('trainer_id')
            .eq('id', context.profile.student_id)
            .maybeSingle(),
    ])

    const { data: trainer } = student?.trainer_id
        ? await supabase.from('profiles').select('name').eq('id', student.trainer_id).maybeSingle()
        : { data: null }

    return (
        <main className="mx-auto w-full max-w-lg p-4 pb-28 md:p-6">
            <header className="mb-4 pt-2">
                <p className="text-xs font-semibold text-indigo-500">Seguimiento semanal</p>
                <h1 className="mt-1 text-2xl font-black text-foreground">¿Cómo estuvo tu semana?</h1>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Te lleva cerca de un minuto y ayuda a tu entrenador a ajustar el plan a tiempo.</p>
            </header>
            <WeeklyCheckinForm
                initialValue={(data as WeeklyCheckinRow | null) ?? null}
                studentUserId={context.user.id}
                trainerName={trainer?.name ?? 'tu entrenador'}
            />
        </main>
    )
}
