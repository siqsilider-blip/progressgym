import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentExerciseProgress } from '@/app/dashboard/students/getStudentExerciseProgress'
import { type WeightUnit } from '@/lib/weight'
import ExerciseProgressCard from '@/app/dashboard/students/ExerciseProgressCard'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import { getStudentAppContext } from '@/lib/auth/student'
import WeeklyWellnessProgressCard, { type WeeklyWellnessPoint } from '@/components/coaching/WeeklyWellnessProgressCard'
import ProgressPhotoGallery, { type ProgressPhotoItem } from '@/components/coaching/ProgressPhotoGallery'

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
            .order('captured_on', { ascending: true })
            .limit(30),
    ])

    const progressPhotos = (await Promise.all((photosResult.data ?? []).map(async (photo) => {
        const { data: signed } = await supabase.storage
            .from('progress-photos')
            .createSignedUrl(photo.storage_path, 3600)
        if (!signed?.signedUrl) return null
        return {
            id: photo.id,
            url: signed.signedUrl,
            capturedOn: photo.captured_on,
            pose: photo.pose,
            marketingConsent: photo.marketing_consent,
        } as ProgressPhotoItem
    }))).filter((photo): photo is ProgressPhotoItem => photo !== null)

    const trainerId = studentResult.data?.trainer_id
    const trainerProfile = trainerId ? await supabase
        .from('profiles')
        .select('weight_unit')
        .eq('id', trainerId)
        .single()
        .then(r => r.data) : null

    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit

    const totalProgress = progressData.reduce((acc, e) => acc + e.progressKg, 0)
    const totalExercises = progressData.length

    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-2xl">
                <div className="mb-4">
                    <StudentPageHeader
                        title="Progreso"
                        subtitle="Evolución por ejercicio"
                        action={<span className="text-sm font-bold text-emerald-500">+{totalProgress.toFixed(1)}{weightUnit}</span>}
                    />
                </div>

                <WeeklyWellnessProgressCard data={(checkinsResult.data as WeeklyWellnessPoint[] | null) ?? []} />
                <ProgressPhotoGallery photos={progressPhotos} role="student" />

                <div className="mb-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                        <p className="text-base font-black text-indigo-400">{totalExercises}</p>
                        <p className="text-[10px] text-muted-foreground">Ejercicios</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                        <p className="text-base font-black text-emerald-400">+{progressData[0]?.progressKg ?? 0}{weightUnit}</p>
                        <p className="text-[10px] text-muted-foreground">Mejor avance</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                        <p className="text-base font-black text-amber-400">{progressData[0]?.progressPercent ?? 0}%</p>
                        <p className="text-[10px] text-muted-foreground">Mejora top</p>
                    </div>
                </div>

                {progressData.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                        <p className="text-4xl">📊</p>
                        <p className="mt-3 text-sm font-semibold text-card-foreground">Todavía no hay progreso registrado</p>
                        <p className="mt-1 text-xs text-muted-foreground">Después de al menos 2 entrenamientos del mismo ejercicio, el progreso aparece acá.</p>
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
            </div>
        </div>
    )
}
