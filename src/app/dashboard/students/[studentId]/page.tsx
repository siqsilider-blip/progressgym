import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentRiskCard from './StudentRiskCard'
import { getStudentRisk } from './getStudentRisk'
import DeleteStudentButton from './DeleteStudentButton'
import LinkStudentAccountForm from './LinkStudentAccountForm'
import ProgramScheduleCard from './ProgramScheduleCard'
import StudentContactCard from './StudentContactCard'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

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

    const [risk, routineAssignment, linkedProfile] = await Promise.all([
        getStudentRisk(studentId),
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

    const fullName =
        `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

    return (
        <div className="mx-auto max-w-3xl space-y-3 p-4 pb-44 md:p-6">
            <DashboardPageHeader
                title={fullName}
                subtitle="Perfil del alumno"
                backHref="/dashboard/students"
            />

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

            {!linkedProfile.data?.id && (
                <LinkStudentAccountForm
                    studentId={params.studentId}
                    isLinked={false}
                />
            )}

            <details className="rounded-xl border border-border bg-card px-3.5 py-3 text-sm">
                <summary className="cursor-pointer font-semibold text-muted-foreground">Más opciones</summary>
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {linkedProfile.data?.id && (
                        <LinkStudentAccountForm
                            studentId={params.studentId}
                            isLinked
                            linkedEmail={linkedProfile.data.email}
                        />
                    )}
                    <DeleteStudentButton studentId={params.studentId} />
                </div>
            </details>

            <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur md:bottom-0">
                <div className="mx-auto grid max-w-xl grid-cols-2 gap-2 px-4 py-3">
                    {assignedRoutineId ? (
                        <Link
                            href={`/dashboard/routines/${assignedRoutineId}`}
                            className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                        >
                            Ver rutina
                        </Link>
                    ) : (
                        <Link
                            href={`/dashboard/students/${params.studentId}/assign-routine`}
                            className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                        >
                            Asignar rutina
                        </Link>
                    )}
                    <Link
                        href={`/dashboard/students/${params.studentId}/progress`}
                        className="rounded-xl border border-indigo-300/40 bg-indigo-500/10 px-3 py-2.5 text-center text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20"
                    >
                        📊 Progreso
                    </Link>
                    <Link
                        href={trainHref}
                        className="rounded-xl bg-indigo-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-indigo-500"
                    >
                        Entrenar
                    </Link>
                    <Link
                        href={`/dashboard/students/${params.studentId}/history`}
                        className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                    >
                        Ver historial de sesiones
                    </Link>
                </div>
            </div>
        </div>
    )
}
