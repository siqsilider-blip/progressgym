import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type StudentWithRoutine = {
    id: string
    first_name: string
    last_name: string
    active_plan: boolean | null
    routineId: string | null
    routineName: string | null
}

export default async function RoutinesPage() {
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
        .select('id, first_name, last_name, active_plan')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })

    if (studentsError) {
        return (
            <div className="p-4 pb-24 md:p-8">
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                    {studentsError.message}
                </div>
            </div>
        )
    }

    const students = studentsData ?? []

    const studentsWithRoutine: StudentWithRoutine[] = []
    const studentsWithoutRoutine: StudentWithRoutine[] = []

    if (students.length > 0) {
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
                first_name: s.first_name ?? '',
                last_name: s.last_name ?? '',
                active_plan: s.active_plan ?? null,
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

    return (
        <div className="p-4 pb-24 md:p-8">
            <div className="mx-auto max-w-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-base font-semibold text-foreground">Rutinas</h1>
                </div>

                {students.length === 0 ? (
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
                ) : (
                    <div className="space-y-4">
                        {studentsWithRoutine.length > 0 && (
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Con rutina
                                </p>
                                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                                    {studentsWithRoutine.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.active_plan ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                                    <p className="truncate text-sm font-medium text-card-foreground">
                                                        {s.first_name} {s.last_name}
                                                    </p>
                                                </div>
                                                <p className="mt-0.5 truncate pl-3 text-xs text-muted-foreground">
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
                                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                                    {studentsWithoutRoutine.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.active_plan ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                                    <p className="truncate text-sm font-medium text-card-foreground">
                                                        {s.first_name} {s.last_name}
                                                    </p>
                                                </div>
                                                <p className="mt-0.5 pl-3 text-xs text-muted-foreground">
                                                    Sin rutina asignada
                                                </p>
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
            </div>
        </div>
    )
}
