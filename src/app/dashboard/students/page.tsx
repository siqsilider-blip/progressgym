import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentsList from '@/components/StudentsList'

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    active_plan: string | null
    created_at: string | null
}

type Routine = {
    id: string
    student_id: string
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
        .order('created_at', { ascending: false })

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

    const students = (studentsData ?? []) as Student[]
    const studentIds = students.map((student) => student.id)

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

            {students.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                    Todavía no tenés alumnos cargados.
                </div>
            ) : (
                <>
                    {/* MOBILE */}
                    <div className="md:hidden">
                        <StudentsList
                            students={students}
                            routinesByStudentId={routinesObject}
                        />
                    </div>

                    {/* DESKTOP */}
                    <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:block dark:border-zinc-800 dark:bg-zinc-900/60">
                        <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                            <div className="col-span-4">Alumno</div>
                            <div className="col-span-3">Email</div>
                            <div className="col-span-2">Plan</div>
                            <div className="col-span-3 text-right">Acciones</div>
                        </div>

                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {students.map((student) => {
                                const fullName =
                                    `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() ||
                                    'Sin nombre'

                                const routineId = routinesByStudentId.get(student.id)

                                const routineHref = routineId
                                    ? `/dashboard/routines/${routineId}`
                                    : `/dashboard/routines/new?studentId=${student.id}`

                                const routineLabel = routineId ? 'Ver rutina' : 'Crear rutina'

                                return (
                                    <div
                                        key={student.id}
                                        className="grid grid-cols-12 gap-4 px-5 py-4 text-sm"
                                    >
                                        <div className="col-span-4">
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {fullName}
                                            </div>
                                            <div className="mt-1 break-all text-xs text-zinc-500">
                                                ID: {student.id}
                                            </div>
                                        </div>

                                        <div className="col-span-3 break-all text-zinc-700 dark:text-zinc-300">
                                            {student.email || 'Sin email'}
                                        </div>

                                        <div className="col-span-2">
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

                                            <Link
                                                href={`/dashboard/students/${student.id}/progress`}
                                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                            >
                                                Progreso
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