import Link from 'next/link'
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
import DeleteStudentButton from './DeleteStudentButton'
import LinkStudentAccountForm from './LinkStudentAccountForm'
import ProgramScheduleCard from './ProgramScheduleCard'
import StudentContactCard from './StudentContactCard'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'

type PageProps = {
    params: Promise<{
        studentId: string
    }>
}

export default async function StudentProfilePage(props: PageProps) {
    const params = await props.params;
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

    const [adherence, stagnation, bestPR, recentPRs, risk, trainerProfile, routineAssignment, linkedProfile] = await Promise.all([
        getStudentAdherence(studentId),
        getStudentStagnation(studentId),
        getStudentBestProgress(studentId),
        getStudentRecentPRs(studentId),
        getStudentRisk(studentId),
        supabase.from('trainer_profiles').select('show_prs').eq('user_id', user.id).maybeSingle(),
        supabase.from('student_routines').select('routine_id, program_started_on').eq('student_id', studentId).eq('status', 'active').maybeSingle(),
        supabase.from('profiles').select('id, email').eq('student_id', studentId).maybeSingle(),
    ])

    const assignedRoutineId = routineAssignment.data?.routine_id ?? null
    const programStartedOn = routineAssignment.data?.program_started_on ?? null

    let activeRoutineName: string | null = null
    let currentWeekLabel = 'Semana 1'
    let programWeekNumber = 1
    let totalProgramWeeks = 1

    if (assignedRoutineId && programStartedOn) {
        const [routineResult, schedule] = await Promise.all([
            supabase
                .from('routines')
                .select('name')
                .eq('id', assignedRoutineId)
                .eq('trainer_id', user.id)
                .maybeSingle(),
            getRoutineSchedule(supabase, assignedRoutineId, { programStartedOn }),
        ])

        activeRoutineName = routineResult.data?.name ?? 'Rutina asignada'
        currentWeekLabel = schedule.currentWeek?.name
            || (schedule.currentWeek ? `Semana ${schedule.currentWeek.week_number}` : 'Semana actual')
        programWeekNumber = schedule.programWeekNumber || 1
        totalProgramWeeks = schedule.totalProgramWeeks || 1
    }

    const trainHref = `/dashboard/students/${params.studentId}/train`

    const showPrs = trainerProfile.data?.show_prs ?? true

    const fullName =
        `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

    return (
        <div className="space-y-4 p-4 pb-36 md:p-6">
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
                        risk.level === 'critical' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                        risk.level === 'high' ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
                        risk.level === 'medium' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' :
                        'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}>
                        {risk.level === 'critical' ? 'Crítico' :
                         risk.level === 'high' ? 'Alto' :
                         risk.level === 'medium' ? 'Medio' : 'Bajo'}
                    </span>
                )}
            </div>

            {assignedRoutineId && programStartedOn && activeRoutineName && (
                <ProgramScheduleCard
                    studentId={studentId}
                    routineName={activeRoutineName}
                    programStartedOn={programStartedOn}
                    currentWeekLabel={currentWeekLabel}
                    programWeekNumber={programWeekNumber}
                    totalProgramWeeks={totalProgramWeeks}
                />
            )}

            <StudentContactCard
                studentId={studentId}
                phone={student.phone ?? null}
            />

            <StudentRiskCard risk={risk} />

            <div className="grid gap-4 lg:grid-cols-2">
                <StudentAdherenceCard
                    adherence={{
                        completedSessions: adherence?.completedSessions ?? 0,
                        plannedSessions: adherence?.plannedSessions ?? 0,
                        percentage: adherence?.percentage ?? 0,
                    }}
                />

                <StudentStagnationCard
                    stagnation={stagnation}
                />
            </div>

            <StudentBestProgressCard
                bestProgress={bestPR}
                weightUnit="kg"
                showPrs={showPrs}
            />

            <StudentRecentPRsCard
                prs={recentPRs}
                weightUnit="kg"
                showPrs={showPrs}
            />

            <LinkStudentAccountForm
                studentId={params.studentId}
                isLinked={!!linkedProfile.data?.id}
                linkedEmail={linkedProfile.data?.email}
            />

            <DeleteStudentButton studentId={params.studentId} />

            <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur md:bottom-0">
                <div className="mx-auto grid max-w-xl grid-cols-3 gap-3 px-4 py-3">
                    {assignedRoutineId ? (
                        <Link
                            href={`/dashboard/routines/${assignedRoutineId}`}
                            className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                        >
                            Ver rutina
                        </Link>
                    ) : (
                        <Link
                            href={`/dashboard/students/${params.studentId}/assign-routine`}
                            className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                        >
                            Asignar rutina
                        </Link>
                    )}
                    <Link
                        href={`/dashboard/students/${params.studentId}/progress`}
                        className="flex-1 rounded-xl border border-indigo-300/40 bg-indigo-500/10 px-4 py-3 text-center text-sm font-semibold text-indigo-400 transition hover:bg-indigo-500/20"
                    >
                        📊 Progreso
                    </Link>
                    <Link
                        href={trainHref}
                        className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
                    >
                        Entrenar
                    </Link>
                    <Link
                        href={`/dashboard/students/${params.studentId}/history`}
                        className="col-span-2 rounded-2xl border border-border bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                    >
                        Ver historial de sesiones
                    </Link>
                </div>
            </div>
        </div>
    )
}
