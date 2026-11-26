import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentsList from '@/components/StudentsList'
import { getStudentsRiskBatch } from './[studentId]/getStudentRisk'
import { getElapsedProgramWeekIndex } from '@/lib/buenosAiresDate'
import { getProgramCyclePosition } from '@/lib/trainingDomain'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import { getServerUser } from '@/lib/auth/server'

type StudentRisk = {
    score: number
    level: 'low' | 'medium' | 'high' | 'critical'
}

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    active_plan: string | null
    created_at: string | null
    risk: StudentRisk | null
}

type StudentRow = Omit<Student, 'risk'>
type ActiveAssignment = {
    student_id: string
    routine_id: string
    program_started_on: string
}

type RoutineSummary = { id: string; name: string | null }
type RoutineWeekRow = { routine_id: string }

export default async function StudentsPage() {
    const supabase = await createClient()
    const user = await getServerUser()
    if (!user) redirect('/login')

    const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, active_plan, created_at')
        .eq('trainer_id', user.id)
        .neq('active_plan', 'inactive')

    if (studentsError) {
        return (
            <div className="p-4 pb-24 md:p-8">
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                    Error al cargar alumnos: {studentsError.message}
                </div>
            </div>
        )
    }

    const students = (studentsData ?? []) as StudentRow[]

    const riskMap = await getStudentsRiskBatch(students.map((s) => s.id))
    const studentsWithRisk = students.map((student) => ({
        ...student,
        risk: riskMap.get(student.id) ?? null,
    }))

    studentsWithRisk.sort((a, b) => (b.risk?.score ?? -1) - (a.risk?.score ?? -1))

    const summary = studentsWithRisk.reduce(
        (acc, s) => {
            acc.total++
            if (s.risk) acc[s.risk.level]++
            return acc
        },
        { total: 0, low: 0, medium: 0, high: 0, critical: 0 }
    )

    const studentIds = studentsWithRisk.map((s) => s.id)
    const operationsByStudentId: Record<string, {
        routineId: string | null
        routineName: string | null
        programWeekNumber: number | null
        totalProgramWeeks: number | null
        hasActiveSession: boolean
        isFinalWeek: boolean
    }> = {}

    if (studentIds.length > 0) {
        const [assignmentsResult, activeSessionsResult] = await Promise.all([
            supabase
                .from('student_routines')
                .select('student_id, routine_id, program_started_on')
                .in('student_id', studentIds)
                .eq('status', 'active'),
            supabase
                .from('workout_sessions')
                .select('student_id')
                .in('student_id', studentIds)
                .eq('status', 'in_progress'),
        ])

        const assignments = (assignmentsResult.data as ActiveAssignment[] | null) ?? []
        const routineIds = [...new Set(assignments.map((assignment) => assignment.routine_id))]
        const activeSessionStudentIds = new Set(
            (activeSessionsResult.data ?? []).map((session) => session.student_id)
        )

        let routineNames = new Map<string, string>()
        const weekCountByRoutine = new Map<string, number>()

        if (routineIds.length > 0) {
            const [routinesResult, weeksResult] = await Promise.all([
                supabase
                    .from('routines')
                    .select('id, name')
                    .in('id', routineIds),
                supabase
                    .from('routine_weeks')
                    .select('routine_id')
                    .in('routine_id', routineIds),
            ])

            routineNames = new Map(
                ((routinesResult.data as RoutineSummary[] | null) ?? [])
                    .map((routine) => [routine.id, routine.name ?? 'Programa'])
            )

            for (const week of (weeksResult.data as RoutineWeekRow[] | null) ?? []) {
                weekCountByRoutine.set(
                    week.routine_id,
                    (weekCountByRoutine.get(week.routine_id) ?? 0) + 1
                )
            }
        }

        const assignmentByStudent = new Map(
            assignments.map((assignment) => [assignment.student_id, assignment])
        )

        for (const student of studentsWithRisk) {
            const assignment = assignmentByStudent.get(student.id)
            if (!assignment) {
                operationsByStudentId[student.id] = {
                    routineId: null,
                    routineName: null,
                    programWeekNumber: null,
                    totalProgramWeeks: null,
                    hasActiveSession: false,
                    isFinalWeek: false,
                }
                continue
            }

            const totalWeeks = Math.max(1, weekCountByRoutine.get(assignment.routine_id) ?? 1)
            const weekNumber = getProgramCyclePosition(
                totalWeeks,
                getElapsedProgramWeekIndex(assignment.program_started_on)
            ).programWeekNumber

            operationsByStudentId[student.id] = {
                routineId: assignment.routine_id,
                routineName: routineNames.get(assignment.routine_id) ?? 'Programa',
                programWeekNumber: weekNumber,
                totalProgramWeeks: totalWeeks,
                hasActiveSession: activeSessionStudentIds.has(student.id),
                isFinalWeek: totalWeeks > 1 && weekNumber === totalWeeks,
            }
        }
    }

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 pb-24 md:p-6 xl:px-8 xl:pb-8">

            {/* Header */}
            <DashboardPageHeader
                title="Alumnos"
                subtitle={summary.critical > 0
                            ? `${summary.critical} crítico${summary.critical === 1 ? '' : 's'} · ordenados por riesgo`
                            : summary.high > 0
                                ? `${summary.high} en riesgo alto · ordenados por riesgo`
                                : `${summary.total} ${summary.total === 1 ? 'alumno' : 'alumnos'}`}
                action={
                    <Link
                        href="/dashboard/students/new"
                        className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary"
                    >
                        + Alumno
                    </Link>
                }
            />

            {studentsWithRisk.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                    <p className="text-3xl mb-3">👥</p>
                    <p className="text-sm font-semibold text-foreground">Todavía no tenés alumnos</p>
                    <p className="mt-1 text-xs text-muted-foreground">Agregá tu primer alumno para empezar</p>
                    <Link
                        href="/dashboard/students/new"
                        className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
                    >
                        + Agregar alumno
                    </Link>
                </div>
            ) : (
                <StudentsList students={studentsWithRisk} operationsByStudentId={operationsByStudentId} />
            )}
        </div>
    )
}
