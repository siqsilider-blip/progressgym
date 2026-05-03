import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStudentExerciseProgress } from '@/app/dashboard/students/getStudentExerciseProgress'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { type WeightUnit } from '@/lib/weight'
import ExerciseProgressCard from '@/app/dashboard/students/ExerciseProgressCard'

export default async function AppProgressPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('id', user.id)
        .single()

    const studentId = profile?.student_id
    if (!studentId) redirect('/app')

    const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name, trainer_id')
        .eq('id', studentId)
        .single()

    const trainerProfile = student?.trainer_id ? await supabase
        .from('profiles')
        .select('weight_unit')
        .eq('id', student.trainer_id)
        .single()
        .then(r => r.data) : null

    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit
    const progressData = await getStudentExerciseProgress(studentId)

    const totalProgress = progressData.reduce((acc, e) => acc + e.progressKg, 0)
    const totalExercises = progressData.length

    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-2xl">
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-foreground">Progreso</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">Evolución por ejercicio</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black text-emerald-500">
                            +{totalProgress.toFixed(1)}{weightUnit}
                        </p>
                        <p className="text-xs text-muted-foreground">en {totalExercises} ejercicios</p>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-border bg-card p-3 text-center">
                        <p className="text-xl font-black text-indigo-400">{totalExercises}</p>
                        <p className="text-[10px] text-muted-foreground">Ejercicios</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-3 text-center">
                        <p className="text-xl font-black text-emerald-400">+{progressData[0]?.progressKg ?? 0}{weightUnit}</p>
                        <p className="text-[10px] text-muted-foreground">Mejor avance</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-3 text-center">
                        <p className="text-xl font-black text-amber-400">{progressData[0]?.progressPercent ?? 0}%</p>
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