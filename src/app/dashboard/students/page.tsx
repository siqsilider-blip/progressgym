import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentsList from '@/components/StudentsList'
import { getStudentRisk } from './[studentId]/getStudentRisk'

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
type Routine = { id: string; student_id: string }

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

    const studentsWithRisk = await Promise.all(
        students.map(async (student) => ({
            ...student,
            risk: await getStudentRisk(student.id),
        }))
    )

    studentsWithRisk.sort((a, b) => b.risk.score - a.risk.score)

    const summary = studentsWithRisk.reduce(
        (acc, s) => { acc.total++; acc[s.risk.level]++; return acc },
        { total: 0, low: 0, medium: 0, high: 0, critical: 0 }
    )

    const studentIds = studentsWithRisk.map((s) => s.id)
    let routinesByStudentId = new Map<string, string>()

    if (studentIds.length > 0) {
        const { data: routinesData } = await supabase
            .from('routines')
            .select('id, student_id')
            .eq('trainer_id', user.id)
            .in('student_id', studentIds)

        routinesByStudentId = new Map(
            ((routinesData ?? []) as Routine[]).map((r) => [r.student_id, r.id])
        )
    }

    const routinesObject = Object.fromEntries(routinesByStudentId)

    return (
        <div className="p-4 pb-24 md:p-8">

            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Alumnos</p>
                    <h1 className="mt-0.5 text-2xl font-black tracking-tight text-white">
                        {summary.total} {summary.total === 1 ? 'alumno' : 'alumnos'}
                    </h1>
                    <p className="mt-1 text-xs text-white/40">
                        {summary.critical > 0
                            ? `${summary.critical} crítico${summary.critical === 1 ? '' : 's'} · ordenados por riesgo`
                            : summary.high > 0
                                ? `${summary.high} en riesgo alto · ordenados por riesgo`
                                : 'Ordenados por nivel de riesgo'}
                    </p>
                </div>
                <Link
                    href="/dashboard/students/new"
                    className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                >
                    + Alumno
                </Link>
            </div>

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
                        <StudentsList students={studentsWithRisk} routinesByStudentId={routinesObject} />
                    </div>

                    {/* Desktop */}
                    <div className="hidden md:block overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                        {/* Header tabla */}
                        <div className="grid grid-cols-12 gap-4 border-b px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white/25"
                            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <div className="col-span-4">Alumno</div>
                            <div className="col-span-2">Riesgo</div>
                            <div className="col-span-3">Email</div>
                            <div className="col-span-3 text-right">Acciones</div>
                        </div>

                        <div className="divide-y divide-white/5">
                            {studentsWithRisk.map((student) => {
                                const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
                                const initials = getInitials(student.first_name, student.last_name)
                                const routineId = routinesByStudentId.get(student.id)
                                const routineHref = routineId ? `/dashboard/routines/${routineId}` : `/dashboard/routines/new?studentId=${student.id}`
                                const riskStyles = getRiskStyles(student.risk.level)

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

                                        <div className="col-span-3 flex items-center text-xs text-white/35 truncate">
                                            {student.email || '—'}
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
                                                href={`/dashboard/students/${student.id}/train`}
                                                className="rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                                            >
                                                Entrenar
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