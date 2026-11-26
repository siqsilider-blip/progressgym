import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentExerciseProgress } from '../../getStudentExerciseProgress'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { type WeightUnit } from '@/lib/weight'
import ExerciseProgressCard from '../../ExerciseProgressCard'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'
import { getServerUser } from '@/lib/auth/server'
import { studentMetric, studentMetricValue } from '../profileStyles'

type PageProps = { params: Promise<{ studentId: string }> }

export default async function StudentProgressPage(props: PageProps) {
    const params = await props.params;
    const supabase = await createClient()
    const user = await getServerUser()
    if (!user) redirect('/login')

    const [student, progressData, trainerProfile] = await Promise.all([
        supabase.from('students').select('first_name, last_name')
            .eq('id', params.studentId).eq('trainer_id', user.id).single(),
        getStudentExerciseProgress(params.studentId),
        getTrainerProfile(),
    ])

    if (!student.data) redirect('/dashboard/students')

    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit
    const fullName = `${student.data?.first_name ?? ''} ${student.data?.last_name ?? ''}`.trim()

    const totalProgress = progressData.reduce((acc, e) => acc + e.progressKg, 0)
    const totalPRs = progressData.length
    const metrics = [
        { label: 'Ejercicios', value: totalPRs },
        { label: 'Mejor avance', value: `+${progressData[0]?.progressKg ?? 0}${weightUnit}` },
        { label: 'Porcentaje del mejor avance', value: `${progressData[0]?.progressPercent ?? 0}%` },
    ]

    return (
        <TrainerPageShell notebook width="standard" className="space-y-4 lg:space-y-7">
            <DashboardPageHeader
                notebook
                title="Progreso"
                subtitle={`${fullName} · +${totalProgress.toFixed(1)}${weightUnit} en ${totalPRs} ejercicios`}
                backHref={`/dashboard/students/${params.studentId}`}
            />

            <dl className="grid grid-cols-3 gap-2 lg:gap-0 lg:border-y lg:border-border">
                {metrics.map((metric) => (
                    <div key={metric.label} className={studentMetric}>
                        <dt className="text-[11px] font-medium text-muted-foreground lg:text-xs lg:text-foreground">{metric.label}</dt>
                        <dd className={`${studentMetricValue} text-foreground`}>{metric.value}</dd>
                    </div>
                ))}
            </dl>

            {progressData.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center lg:rounded-none lg:border-x-0 lg:border-solid lg:px-0 lg:text-left">
                    <p className="text-sm font-semibold text-foreground">
                        Todavía no hay progreso registrado
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Después de al menos 2 entrenamientos del mismo ejercicio, el progreso aparece acá.
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 xl:grid-cols-2">
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
        </TrainerPageShell>
    )
}
