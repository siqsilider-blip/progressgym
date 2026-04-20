import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentRoutineSelector from './StudentRoutineSelector'

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
}

type Routine = {
    id: string
    student_id: string
    name: string | null
    days_per_week: number | null
}

type PageProps = {
    searchParams?: {
        studentId?: string
    }
}

export default async function RoutinesPage({ searchParams }: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const selectedStudentId = searchParams?.studentId ?? ''

    const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })

    if (studentsError) {
        return (
            <div className="p-4 pb-24 md:p-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Rutinas
                </h1>

                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                    {studentsError.message}
                </div>
            </div>
        )
    }

    const students = ((studentsData ?? []) as Student[]).map((student) => ({
        id: student.id,
        first_name: student.first_name ?? '',
        last_name: student.last_name ?? '',
    }))

    type StudentWithRoutine = {
        id: string
        first_name: string
        last_name: string
        routineId: string | null
        routineName: string | null
    }

    let studentsWithRoutine: StudentWithRoutine[] = []
    let studentsWithoutRoutine: StudentWithRoutine[] = []

    if (!selectedStudentId && students.length > 0) {
        const studentIds = students.map((s) => s.id)

        const { data: assignments } = await supabase
            .from('student_routines')
            .select('student_id, routine_id')
            .in('student_id', studentIds)

        const assignmentMap = new Map<string, string>()
        for (const a of assignments ?? []) {
            if (a.routine_id) assignmentMap.set(a.student_id, a.routine_id)
        }

        const routineIds = Array.from(new Set(Array.from(assignmentMap.values())))
        const routineNameMap = new Map<string, string>()

        if (routineIds.length > 0) {
            const { data: routinesData } = await supabase
                .from('routines')
                .select('id, name')
                .in('id', routineIds)
                .eq('trainer_id', user.id)

            for (const r of routinesData ?? []) {
                if (r.id) routineNameMap.set(r.id, r.name ?? 'Rutina')
            }
        }

        for (const s of students) {
            const routineId = assignmentMap.get(s.id) ?? null
            const routineName = routineId ? (routineNameMap.get(routineId) ?? 'Rutina') : null
            const entry: StudentWithRoutine = {
                id: s.id,
                first_name: s.first_name,
                last_name: s.last_name,
                routineId,
                routineName,
            }
            if (routineId) {
                studentsWithRoutine.push(entry)
            } else {
                studentsWithoutRoutine.push(entry)
            }
        }
    }

    let selectedRoutine: Routine | null = null
    let routineDaysCount = 0

    if (selectedStudentId) {
        const { data: assignment, error: assignmentError } = await supabase
            .from('student_routines')
            .select('id, routine_id')
            .eq('student_id', selectedStudentId)
            .maybeSingle()

        if (assignmentError) {
            throw new Error(assignmentError.message)
        }

        if (assignment?.routine_id) {
            const { data: routineData, error: routineError } = await supabase
                .from('routines')
                .select('id, student_id, name, days_per_week')
                .eq('id', assignment.routine_id)
                .eq('trainer_id', user.id)
                .eq('student_id', selectedStudentId)
                .maybeSingle()

            if (routineError) {
                throw new Error(routineError.message)
            }

            selectedRoutine = (routineData as Routine | null) ?? null
        }

        if (!selectedRoutine) {
            const { data: fallbackRoutine, error: fallbackError } = await supabase
                .from('routines')
                .select('id, student_id, name, days_per_week')
                .eq('trainer_id', user.id)
                .eq('student_id', selectedStudentId)
                .maybeSingle()

            if (fallbackError) {
                throw new Error(fallbackError.message)
            }

            selectedRoutine = (fallbackRoutine as Routine | null) ?? null

            if (selectedRoutine?.id) {
                if (assignment?.id) {
                    const { error: repairError } = await supabase
                        .from('student_routines')
                        .update({
                            routine_id: selectedRoutine.id,
                            assigned_at: new Date().toISOString(),
                        })
                        .eq('id', assignment.id)

                    if (repairError) {
                        throw new Error(repairError.message)
                    }
                } else {
                    const { error: insertError } = await supabase
                        .from('student_routines')
                        .insert({
                            student_id: selectedStudentId,
                            routine_id: selectedRoutine.id,
                            assigned_at: new Date().toISOString(),
                        })

                    if (insertError) {
                        throw new Error(insertError.message)
                    }
                }
            }
        }

        if (selectedRoutine?.id) {
            const { count } = await supabase
                .from('routine_days')
                .select('id', { count: 'exact', head: true })
                .eq('routine_id', selectedRoutine.id)

            routineDaysCount = count ?? 0
        }
    }

    return (
        <div className="p-4 pb-24 md:p-8">
            <div className="mb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Rutinas
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Elegí un alumno para ver o editar su rutina.
                </p>
            </div>

            <div className="mx-auto max-w-xl space-y-4">
                <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                    <StudentRoutineSelector
                        students={students}
                        selectedStudentId={selectedStudentId}
                    />
                </div>

                {selectedStudentId && selectedRoutine && (
                    <div className="rounded-2xl border border-border bg-card shadow-sm">
                        <div className="p-4">
                            <h2 className="truncate text-xl font-bold text-card-foreground">
                                {selectedRoutine.name ?? 'Rutina'}
                            </h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {routineDaysCount > 0
                                    ? `${routineDaysCount} ${routineDaysCount === 1 ? 'día' : 'días'}`
                                    : 'Rutina'} · Lista para entrenar
                            </p>
                        </div>

                        <div className="space-y-2 px-4 pb-4">
                            <Link
                                href={`/dashboard/students/${selectedStudentId}/train`}
                                className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500"
                            >
                                Entrenar
                            </Link>

                            <Link
                                href={`/dashboard/routines/${selectedRoutine.id}`}
                                className="flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-secondary text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                            >
                                Editar rutina
                            </Link>
                        </div>
                    </div>
                )}

                {selectedStudentId && !selectedRoutine && (
                    <div className="overflow-hidden rounded-2xl border border-dashed border-border bg-card shadow-sm">
                        <div className="p-5 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/15">
                                <svg
                                    className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                            </div>

                            <h3 className="mt-3 text-base font-semibold text-card-foreground">
                                Este alumno todavía no tiene rutina
                            </h3>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Creá una rutina para empezar a planificar su entrenamiento.
                            </p>

                            <Link
                                href={`/dashboard/routines/new?studentId=${selectedStudentId}`}
                                className="mt-4 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                            >
                                Crear rutina
                            </Link>
                        </div>
                    </div>
                )}

                {!selectedStudentId && students.length > 0 && (
                    <div className="space-y-4">
                        {studentsWithRoutine.length > 0 && (
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Con rutina
                                </p>
                                <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
                                    {studentsWithRoutine.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-card-foreground">
                                                    {s.first_name} {s.last_name}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {s.routineName}
                                                </p>
                                            </div>
                                            <Link
                                                href={`/dashboard/routines/${s.routineId}`}
                                                className="shrink-0 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                                            >
                                                Ver rutina
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {studentsWithoutRoutine.length > 0 && (
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Sin rutina
                                </p>
                                <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
                                    {studentsWithoutRoutine.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-card-foreground">
                                                    {s.first_name} {s.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Sin rutina asignada</p>
                                            </div>
                                            <Link
                                                href={`/dashboard/routines/new?studentId=${s.id}`}
                                                className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
                                            >
                                                Crear rutina
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!selectedStudentId && students.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                        <h3 className="text-base font-semibold text-card-foreground">
                            No tenés alumnos todavía
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Agregá tu primer alumno para crear su rutina.
                        </p>

                        <Link
                            href="/dashboard/students/new"
                            className="mt-4 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                        >
                            Agregar alumno
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}