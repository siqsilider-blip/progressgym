import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentsList from '@/components/StudentsList'
import { getStudentRisk } from './[studentId]/getStudentRisk'
import StudentsAlertsCard from '@/components/StudentsAlertsCard'

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

type Routine = {
    id: string
    student_id: string
}

function getRiskStyles(level: StudentRisk['level']) {
    switch (level) {
        case 'critical':
            return {
                badge: 'border-red-500/30 bg-red-500/15 text-red-400',
                label: 'Crítico',
            }
        case 'high':
            return {
                badge: 'border-orange-500/30 bg-orange-500/15 text-orange-400',
                label: 'Alto',
            }
        case 'medium':
            return {
                badge: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300',
                label: 'Medio',
            }
        case 'low':
        default:
            return {
                badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
                label: 'Bajo',
            }
    }
}

export default async function StudentsPage() {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, active_plan, created_at')
        .eq('trainer_id', user.id)

    if (studentsError) {
        return (
            <div className="px-4 pb-6 text-zinc-900 md:p-8 dark:text-white">
                <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            Alumnos
                        </h1>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Listado de tus alumnos cargados
                        </p>
                    </div>

                    <Link
                        href="/dashboard/students/new"
                        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-indigo-500 sm:w-auto sm:rounded-lg sm:px-4 sm:py-2"
                    >
                        + Agregar alumno
                    </Link>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    Error al cargar alumnos: {studentsError.message}
                </div>
            </div>
        )
    }

    const students = (studentsData ?? []) as StudentRow[]

    const studentsWithRisk = await Promise.all(
        students.map(async (student) => {
            const risk = await getStudentRisk(student.id)

            return {
                ...student,
                risk,
            }
        })
    )

    studentsWithRisk.sort((a, b) => b.risk.score - a.risk.score)

    const alerts = studentsWithRisk
        .filter((s) => s.risk.level === 'critical' || s.risk.level === 'high')
        .map((s) => ({
            id: s.id,
            name: s.first_name ?? 'Alumno',
            level: s.risk.level as 'critical' | 'high',
            score: s.risk.score,
        }))
        .sort((a, b) => b.score - a.score)

    const summary = studentsWithRisk.reduce(
        (acc, student) => {
            acc.total += 1
            acc[student.risk.level] += 1
            return acc
        },
        {
            total: 0,
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
        }
    )

    const studentIds = studentsWithRisk.map((student) => student.id)

    let routinesByStudentId = new Map<string, string>()

    if (studentIds.length > 0) {
        const { data: routinesData, error: routinesError } = await supabase
            .from('routines')
            .select('id, student_id')
            .eq('trainer_id', user.id)
            .in('student_id', studentIds)

        if (routinesError) {
            return (
                <div className="px-4 pb-6 text-zinc-900 md:p-8 dark:text-white">
                    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Alumnos
                            </h1>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                Ordenados por riesgo (alto → bajo)
                            </p>
                        </div>

                        <Link
                            href="/dashboard/students/new"
                            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-indigo-500 sm:w-auto sm:rounded-lg sm:px-4 sm:py-2"
                        >
                            + Agregar alumno
                        </Link>
                    </div>

                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        Error al cargar rutinas: {routinesError.message}
                    </div>
                </div>
            )
        }

        const routines = (routinesData ?? []) as Routine[]
        routinesByStudentId = new Map(
            routines.map((routine) => [routine.student_id, routine.id])
        )
    }

    const routinesObject = Object.fromEntries(routinesByStudentId)

    return (
        <div className="px-4 pb-6 text-zinc-900 md:p-8 dark:text-white">
            <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                        Alumnos
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {summary.total} {summary.total === 1 ? 'alumno' : 'alumnos'}{summary.critical > 0 ? ` · ${summary.critical} crítico${summary.critical === 1 ? '' : 's'}` : summary.high > 0 ? ` · ${summary.high} en riesgo alto` : ''}
                    </p>
                </div>

                <Link
                    href="/dashboard/students/new"
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-indigo-500 sm:w-auto sm:rounded-lg sm:px-4 sm:py-2"
                >
                    + Agregar alumno
                </Link>
            </div>


            {studentsWithRisk.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                    Todavía no tenés alumnos cargados.
                </div>
            ) : (
                <>
                    <div className="mb-4">
                        <StudentsAlertsCard alerts={alerts} />
                    </div>

                    {/* MOBILE */}
                    <div className="md:hidden">
                        <StudentsList
                            students={studentsWithRisk}
                            routinesByStudentId={routinesObject}
                        />
                    </div>

                    {/* DESKTOP */}
                    <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:block dark:border-zinc-800 dark:bg-zinc-900/60">
                        <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                            <div className="col-span-4">Alumno</div>
                            <div className="col-span-2">Riesgo</div>
                            <div className="col-span-2">Email</div>
                            <div className="col-span-1">Plan</div>
                            <div className="col-span-3 text-right">Acciones</div>
                        </div>

                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {studentsWithRisk.map((student) => {
                                const fullName =
                                    `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() ||
                                    'Sin nombre'

                                const routineId = routinesByStudentId.get(student.id)

                                const routineHref = routineId
                                    ? `/dashboard/routines/${routineId}`
                                    : `/dashboard/routines/new?studentId=${student.id}`

                                const routineLabel = routineId ? 'Ver rutina' : 'Crear rutina'
                                const riskStyles = getRiskStyles(student.risk.level)

                                return (
                                    <div
                                        key={student.id}
                                        className="grid grid-cols-12 gap-4 px-5 py-4 text-sm"
                                    >
                                        <div className="col-span-4">
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {fullName}
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskStyles.badge}`}
                                                >
                                                    {riskStyles.label}
                                                </span>
                                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                    {student.risk.score}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="col-span-2 break-all text-zinc-700 dark:text-zinc-300">
                                            {student.email || 'Sin email'}
                                        </div>

                                        <div className="col-span-1">
                                            <span className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                                                {student.active_plan || 'Sin plan'}
                                            </span>
                                        </div>

                                        <div className="col-span-3 flex flex-wrap justify-end gap-2">
                                            <Link
                                                href={`/dashboard/students/${student.id}`}
                                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                            >
                                                Ver perfil
                                            </Link>

                                            <Link
                                                href={routineHref}
                                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                            >
                                                {routineLabel}
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