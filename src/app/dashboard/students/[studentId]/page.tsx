import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentAdherence } from '../getStudentAdherence'
import { getStudentStagnation } from '../getStudentStagnation'
import { getStudentBestProgress } from '../getStudentBestProgress'
import { getStudentRecentPRs } from '../getStudentRecentPRs'
import StudentAdherenceCard from '../StudentAdherenceCard'
import StudentStagnationCard from '../StudentStagnationCard'
import StudentBestProgressCard from '../StudentBestProgressCard'
import StudentRecentPRsCard from '../StudentRecentPRsCard'
import StudentRiskCard from './StudentRiskCard'
import { getStudentRisk } from './getStudentRisk'

type PageProps = {
    params: {
        studentId: string
    }
}

export default async function StudentProfilePage({ params }: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const studentId = params.studentId

    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

    if (!student) {
        return <div className="p-6">No se encontró el alumno.</div>
    }

    const [adherence, stagnation, bestPR, recentPRs, risk, trainerProfile] = await Promise.all([
        getStudentAdherence(studentId),
        getStudentStagnation(studentId),
        getStudentBestProgress(studentId),
        getStudentRecentPRs(studentId),
        getStudentRisk(studentId),
        supabase.from('trainer_profiles').select('show_prs').eq('user_id', user.id).maybeSingle(),
    ])

    const showPrs = (trainerProfile.data as any)?.show_prs ?? true

    const fullName =
        `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

    return (
        <div className="space-y-4 p-4 md:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {fullName}
                    </h1>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Perfil del alumno
                    </p>
                </div>
                {risk && (
                    <span className={`mt-1 shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        (risk as any).level === 'critical' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                        (risk as any).level === 'high' ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
                        (risk as any).level === 'medium' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' :
                        'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}>
                        {(risk as any).level === 'critical' ? 'Crítico' :
                         (risk as any).level === 'high' ? 'Alto' :
                         (risk as any).level === 'medium' ? 'Medio' : 'Bajo'}
                    </span>
                )}
            </div>

            <StudentRiskCard risk={risk as any} />

            <div className="grid gap-4 lg:grid-cols-2">
                <StudentAdherenceCard
                    adherence={{
                        completedSessions: adherence?.completedSessions ?? 0,
                        plannedSessions: adherence?.plannedSessions ?? 0,
                        percentage: adherence?.percentage ?? 0,
                    }}
                />

                <StudentStagnationCard
                    stagnation={(stagnation ?? null) as any}
                />
            </div>

            <StudentBestProgressCard
                bestProgress={(bestPR ?? null) as any}
                weightUnit="kg"
                showPrs={showPrs}
            />

            <StudentRecentPRsCard
                prs={(recentPRs ?? []) as any}
                weightUnit="kg"
                showPrs={showPrs}
            />
        </div>
    )
}