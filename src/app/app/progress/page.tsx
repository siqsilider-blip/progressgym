import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Dumbbell, History, Ruler, TrendingUp, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getStudentExerciseProgress } from '@/app/dashboard/students/getStudentExerciseProgress'
import { formatPreciseWeight, type WeightUnit } from '@/lib/weight'
import { NotebookLinkRow, StudentNotebookHeader, notebookGroup, notebookPage, notebookSectionTitle } from '@/components/student/StudentNotebook'
import { getStudentAppContext } from '@/lib/auth/student'
import WeeklyWellnessProgressCard, { type WeeklyWellnessPoint } from '@/components/coaching/WeeklyWellnessProgressCard'
import ProgressPhotoGallery, { type ProgressPhotoItem } from '@/components/coaching/ProgressPhotoGallery'
import { createProgressPhotoUrls, type ProgressPhotoRecord } from '@/lib/progressPhotoUrls'
import StudentExerciseProgressList from './StudentExerciseProgressList'

function ProgressBackLink() {
    return (
        <Link href="/app/progress" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-soft">
            <ArrowLeft className="size-4" aria-hidden="true" /> Volver a Progreso
        </Link>
    )
}

export default async function AppProgressPage({ searchParams }: { searchParams: Promise<{ view?: string; exercise?: string }> }) {
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const studentId = context.profile.student_id
    if (!studentId) redirect('/app')
    const { view, exercise: requestedExercise } = await searchParams
    const supabase = await createClient()

    if (view === 'tracking') {
        const [checkins, photos] = await Promise.all([
            supabase.from('student_weekly_checkins')
                .select('week_start, energy, sleep_quality, stress, training_difficulty, body_weight, waist_cm')
                .eq('student_id', studentId).order('week_start', { ascending: true }).limit(24),
            supabase.from('student_progress_photos')
                .select('id, storage_path, captured_on, pose, marketing_consent')
                .eq('student_id', studentId).order('captured_on', { ascending: false }).limit(30),
        ])
        const signedPhotos = await createProgressPhotoUrls(supabase, (photos.data ?? []) as ProgressPhotoRecord[])
        const progressPhotos: ProgressPhotoItem[] = signedPhotos.reverse().map((photo) => ({
            id: photo.id, url: photo.url, capturedOn: photo.captured_on, pose: photo.pose, marketingConsent: photo.marketing_consent,
        }))

        return (
            <main className={notebookPage}>
                <StudentNotebookHeader section="Progreso" title="Seguimiento" subtitle="Bienestar, medidas y fotos" />
                <ProgressBackLink />
                <WeeklyWellnessProgressCard data={(checkins.data as WeeklyWellnessPoint[] | null) ?? []} />
                <ProgressPhotoGallery photos={progressPhotos} role="student" />
            </main>
        )
    }

    const [student, progressData] = await Promise.all([
        supabase.from('students').select('trainer_id').eq('id', studentId).single(),
        getStudentExerciseProgress(studentId),
    ])
    const trainerId = student.data?.trainer_id
    const { data: trainerProfile } = trainerId
        ? await supabase.from('profiles').select('weight_unit').eq('id', trainerId).maybeSingle()
        : { data: null }
    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit

    if (view === 'exercises') {
        return (
            <main className={notebookPage}>
                <StudentNotebookHeader section="Progreso" title="Por ejercicio" subtitle="Elegí un ejercicio para ver cómo evolucionó tu carga." />
                <ProgressBackLink />
                {progressData.length > 0
                    ? <StudentExerciseProgressList exercises={progressData} weightUnit={weightUnit} initialExerciseId={requestedExercise} />
                    : <p className="border-t border-border pt-4 text-sm text-muted-foreground">Cuando tengas dos registros del mismo ejercicio vas a poder comparar tus cargas.</p>}
            </main>
        )
    }

    const bestProgress = progressData.find((item) => item.progressKg > 0)
    const totalExercises = progressData.length

    return (
        <main className={notebookPage}>
            <StudentNotebookHeader section="Seguimiento personal" title="Progreso" />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-3">
                <strong className="text-3xl font-semibold tracking-tight tabular-nums">{totalExercises}</strong>
                <span className="text-sm text-muted-foreground">{totalExercises === 1 ? 'ejercicio con cargas para comparar' : 'ejercicios con cargas para comparar'}</span>
            </div>
            {bestProgress && (
                <section className={notebookGroup} aria-labelledby="progress-highlight">
                    <h2 className={notebookSectionTitle} id="progress-highlight">Mayor avance</h2>
                    <NotebookLinkRow
                        href={`/app/progress?view=exercises&exercise=${encodeURIComponent(bestProgress.exerciseId)}`}
                        icon={TrendingUp}
                        title={bestProgress.exerciseName}
                        subtitle={`+${formatPreciseWeight(bestProgress.progressKg, weightUnit)} desde tu primer registro`}
                    />
                </section>
            )}
            <section className={notebookGroup} aria-labelledby="progress-records">
                <h2 className={notebookSectionTitle} id="progress-records">Tus registros</h2>
                <div>
                    <NotebookLinkRow href="/app/progress?view=exercises" title="Por ejercicio" subtitle="Cargas y evolución" icon={Dumbbell} />
                    <NotebookLinkRow href="/app/history" title="Historial" subtitle="Sesiones y series guardadas" icon={History} />
                    <NotebookLinkRow href="/app/progress?view=tracking" title="Seguimiento" subtitle="Bienestar, peso, cintura y fotos" icon={Ruler} />
                    <NotebookLinkRow href="/app/logros" title="Logros" subtitle="Tus marcas personales" icon={Trophy} />
                </div>
            </section>
        </main>
    )
}
