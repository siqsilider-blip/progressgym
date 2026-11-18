import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock3, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getStudentExerciseProgress } from '@/app/dashboard/students/getStudentExerciseProgress'
import { type WeightUnit } from '@/lib/weight'
import ExerciseProgressCard from '@/app/dashboard/students/ExerciseProgressCard'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import { getStudentAppContext } from '@/lib/auth/student'
import WeeklyWellnessProgressCard, { type WeeklyWellnessPoint } from '@/components/coaching/WeeklyWellnessProgressCard'
import ProgressPhotoGallery, { type ProgressPhotoItem } from '@/components/coaching/ProgressPhotoGallery'
import { createProgressPhotoUrls, type ProgressPhotoRecord } from '@/lib/progressPhotoUrls'

export default async function AppProgressPage() {
    const supabase = await createClient()
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const studentId = context.profile.student_id
    if (!studentId) redirect('/app')

    const [studentResult, progressData, checkinsResult, photosResult] = await Promise.all([
        supabase
            .from('students')
            .select('trainer_id')
            .eq('id', studentId)
            .single(),
        getStudentExerciseProgress(studentId),
        supabase
            .from('student_weekly_checkins')
            .select('week_start, energy, sleep_quality, stress, training_difficulty, body_weight, waist_cm')
            .eq('student_id', studentId)
            .order('week_start', { ascending: true })
            .limit(24),
        supabase
            .from('student_progress_photos')
            .select('id, storage_path, captured_on, pose, marketing_consent')
            .eq('student_id', studentId)
            .order('captured_on', { ascending: false })
            .limit(30),
    ])

    const signedPhotos = await createProgressPhotoUrls(
        supabase,
        (photosResult.data ?? []) as ProgressPhotoRecord[]
    )
    const progressPhotos: ProgressPhotoItem[] = signedPhotos.reverse().map((photo) => ({
        id: photo.id,
        url: photo.url,
        capturedOn: photo.captured_on,
        pose: photo.pose,
        marketingConsent: photo.marketing_consent,
    }))

    const trainerId = studentResult.data?.trainer_id
    const trainerProfile = trainerId ? await supabase
        .from('profiles')
        .select('weight_unit')
        .eq('id', trainerId)
        .single()
        .then(r => r.data) : null

    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit

    const totalExercises = progressData.length
    const bestProgress = progressData[0] ?? null

    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-2xl">
                <div className="mb-4">
                    <StudentPageHeader
                        title="Progreso"
                        subtitle="Tus avances, de forma simple"
                    />
                </div>

                <section className="mb-3 rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumen</p>
                    {bestProgress ? (
                        <div className="mt-2 flex items-end justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-sm font-black text-foreground">{totalExercises} {totalExercises === 1 ? 'ejercicio con evolución' : 'ejercicios con evolución'}</p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">Mayor avance: {bestProgress.exerciseName}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-lg font-black text-emerald-500">+{bestProgress.progressKg}{weightUnit}</p>
                                <p className="text-[11px] font-semibold text-muted-foreground">{bestProgress.firstWeight}{weightUnit} → {bestProgress.bestWeight}{weightUnit}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2">
                            <p className="text-sm font-black text-foreground">Tu evolución va a aparecer acá</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">Necesitamos al menos dos registros del mismo ejercicio para compararlos.</p>
                        </div>
                    )}
                </section>

                <div className="mb-5 grid grid-cols-2 gap-2">
                    <Link href="/app/history" prefetch className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground">
                        <Clock3 className="h-4 w-4 shrink-0 text-brand-soft" />
                        Historial
                        <span className="ml-auto text-primary">→</span>
                    </Link>
                    <Link href="/app/logros" prefetch className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground">
                        <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
                        Logros
                        <span className="ml-auto text-primary">→</span>
                    </Link>
                </div>

                <section>
                    <div className="mb-2">
                        <h2 className="text-base font-black text-foreground">Progreso por ejercicio</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">Comparamos tu primer registro con tu mejor marca.</p>
                    </div>

                    {progressData.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                            <p className="text-4xl">📊</p>
                            <p className="mt-3 text-sm font-semibold text-card-foreground">Todavía no hay progreso registrado</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">Después de al menos 2 entrenamientos del mismo ejercicio, el progreso aparece acá.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {progressData.map((exercise, index) => (
                                <ExerciseProgressCard
                                    key={exercise.exerciseId}
                                    exercise={exercise}
                                    weightUnit={weightUnit}
                                    rank={index}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section className="mt-7">
                    <div className="mb-2">
                        <h2 className="text-base font-black text-foreground">Otros seguimientos</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">Bienestar, medidas y fotos de progreso.</p>
                    </div>
                    <WeeklyWellnessProgressCard data={(checkinsResult.data as WeeklyWellnessPoint[] | null) ?? []} />
                    <ProgressPhotoGallery photos={progressPhotos} role="student" />
                </section>
            </div>
        </div>
    )
}
