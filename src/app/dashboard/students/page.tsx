import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentsList from '@/components/StudentsList'
import { getStudentsRiskBatch, fallbackRisk } from './[studentId]/getStudentRisk'
import { getElapsedProgramWeekIndex } from '@/lib/buenosAiresDate'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

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
    risk: StudentRisk
}

type StudentRow = Omit<Student, 'risk'>
type ActiveAssignment = {
    student_id: string
    routine_id: string
    program_started_on: string
}

type RoutineSummary = { id: string; name: string | null }
type RoutineWeekRow = { routine_id: string }

function getRiskStyles(level: StudentRisk['level']) {
    switch (level) {
        case 'critical': return { badge: 'border-red-500/30 bg-red-500/10 text-red-400', label: 'Crítico' }
        case 'high': return { badge: 'border-orange-500/30 bg-orange-500/10 text-orange-400', label: 'Alto' }
        case 'medium': return { badge: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300', label: 'Medio' }
        default: return { badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', label: 'Bajo' }
    }
}

function getInitials(first: string | null, last: string | null) {
    return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || '?'
}

export default async function StudentsPage() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, active_plan, created_at')
        .eq('trainer_id', user.id)

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
        risk: riskMap.get(student.id) ?? fallbackRisk(),
    }))

    studentsWithRisk.sort((a, b) => b.risk.score - a.risk.score)

    const summary = studentsWithRisk.reduce(
        (acc, s) => { acc.total++; acc[s.risk.level]++; return acc },
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
            const weekNumber = Math.min(
                getElapsedProgramWeekIndex(assignment.program_started_on) + 1,
                totalWeeks
            )

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
        <div className="mx-auto max-w-6xl space-y-4 p-4 pb-24 md:p-6">

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
                        className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
                    >
                        + Alumno
                    </Link>
                }
            />

            {studentsWithRisk.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
                    <p className="text-3xl mb-3">👥</p>
                    <p className="text-sm font-semibold text-white/60">Todavía no tenés alumnos</p>
                    <p className="mt-1 text-xs text-white/30">Agregá tu primer alumno para empezar</p>
                    <Link
                        href="/dashboard/students/new"
                        className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    >
                        + Agregar alumno
                    </Link>
                </div>
            ) : (
                <>
                    {/* Mobile */}
                    <div className="md:hidden">
                        <StudentsList students={studentsWithRisk} operationsByStudentId={operationsByStudentId} />
                    </div>

                    {/* Desktop */}
                    <div className="hidden overflow-hidden rounded-2xl border border-white/[0.07] md:block">
                        {/* Header tabla */}
                        <div className="grid grid-cols-12 gap-4 border-b px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white/25"
                            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <div className="col-span-4">Alumno</div>
                            <div className="col-span-2">Riesgo</div>
                            <div className="col-span-3">Programa</div>
                            <div className="col-span-3 text-right">Acciones</div>
                        </div>

                        <div className="divide-y divide-white/5">
                            {studentsWithRisk.map((student) => {
                                const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
                                const initials = getInitials(student.first_name, student.last_name)
                                const riskStyles = getRiskStyles(student.risk.level)
                                const operation = operationsByStudentId[student.id]
                                const hasProgram = Boolean(operation?.routineId)

                                return (
                                    <div key={student.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 text-sm transition hover:bg-white/[0.02]">
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-violet-300"
                                                style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.25)' }}>
                                                {initials}
                                            </div>
                                            <span className="font-semibold text-white">{fullName}</span>
                                        </div>

                                        <div className="col-span-2 flex items-center">
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${riskStyles.badge}`}>
                                                {riskStyles.label}
                                            </span>
                                        </div>

                                        <div className="col-span-3 flex items-center">
                                            {operation?.hasActiveSession ? (
                                                <span className="text-xs font-semibold text-indigo-400">Sesión en curso</span>
                                            ) : hasProgram ? (
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-medium text-white/60">{operation.routineName}</p>
                                                    <p className={`text-[10px] ${operation.isFinalWeek ? 'font-semibold text-amber-400' : 'text-white/30'}`}>
                                                        Semana {operation.programWeekNumber} de {operation.totalProgramWeeks}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-semibold text-rose-400">Sin programa</span>
                                            )}
                                        </div>

                                        <div className="col-span-3 flex items-center justify-end gap-2">
                                            <Link
                                                href={`/dashboard/students/${student.id}`}
                                                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-white/60 transition hover:text-white hover:bg-white/[0.06]"
                                                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                                            >
                                                Ver perfil
                                            </Link>
                                            <Link
                                                href={hasProgram
                                                    ? `/dashboard/students/${student.id}/train`
                                                    : `/dashboard/students/${student.id}/assign-routine`}
                                                className="rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                                            >
                                                {operation?.hasActiveSession ? 'Continuar' : hasProgram ? 'Entrenar' : 'Asignar'}
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
