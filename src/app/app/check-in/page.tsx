import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentAppContext } from '@/lib/auth/student'
import { getCurrentBuenosAiresWeek } from '@/lib/buenosAiresDate'
import WeeklyCheckinForm from '@/components/coaching/WeeklyCheckinForm'

type WeeklyCheckinRow = {
    id: string
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
            .select('id, energy, sleep_quality, stress, training_difficulty, had_pain, pain_details, body_weight, waist_cm, comment')
            .eq('student_id', context.profile.student_id)
            .eq('week_start', weekStart)
            .maybeSingle(),
        supabase
            .from('students')
            .select('trainer_id')
            .eq('id', context.profile.student_id)
            .maybeSingle(),
    ])

    const [{ data: trainer }, photosResult] = await Promise.all([
        student?.trainer_id
            ? supabase.from('profiles').select('name').eq('id', student.trainer_id).maybeSingle()
            : Promise.resolve({ data: null }),
        data?.id
            ? supabase
                .from('student_progress_photos')
                .select('id, storage_path, pose, marketing_consent, created_at')
                .eq('student_id', context.profile.student_id)
                .eq('weekly_checkin_id', data.id)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
    ])

    const seenPoses = new Set<string>()
    const savedPhotos = (await Promise.all((photosResult.data ?? []).map(async (photo) => {
        if (seenPoses.has(photo.pose)) return null
        seenPoses.add(photo.pose)
        const { data: signed } = await supabase.storage
            .from('progress-photos')
            .createSignedUrl(photo.storage_path, 3600)
        if (!signed?.signedUrl) return null
        return {
            id: photo.id,
            url: signed.signedUrl,
            pose: photo.pose as 'front' | 'side' | 'back',
            marketingConsent: photo.marketing_consent,
        }
    }))).filter((photo): photo is NonNullable<typeof photo> => photo !== null)

    return (
        <main className="mx-auto w-full max-w-lg p-4 pb-28 md:p-6">
            <header className="mb-4 pt-2">
                <p className="text-xs font-semibold text-indigo-500">Seguimiento semanal</p>
                <h1 className="mt-1 text-2xl font-black text-foreground">¿Cómo estuvo tu semana?</h1>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Te lleva cerca de un minuto y ayuda a tu entrenador a ajustar el plan a tiempo.</p>
            </header>
            <WeeklyCheckinForm
                initialValue={(data as WeeklyCheckinRow | null) ?? null}
                initialPhotos={savedPhotos}
                studentUserId={context.user.id}
                trainerName={trainer?.name ?? 'tu entrenador'}
            />
        </main>
    )
}
