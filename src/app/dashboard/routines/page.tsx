import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import RoutinesClient from './RoutinesClient'

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
        return <RoutinesClient students={[]} routines={[]} error={studentsError.message} />
    }

    const students = studentsData ?? []

    if (students.length === 0) {
        return (
            <div className="p-4 pb-24 md:p-8">
                <div className="mx-auto max-w-xl">
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
                </div>
            </div>
        )
    }

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
    const routineMap = new Map<string, { id: string; name: string | null }>()

    if (routineIds.length > 0) {
        const { data: routinesData } = await supabase
            .from('routines')
            .select('id, name')
            .in('id', routineIds)
            .eq('trainer_id', user.id)

        for (const r of routinesData ?? []) {
            if (r.id) routineMap.set(r.id, { id: r.id, name: r.name ?? null })
        }
    }

    const routines = Array.from(assignmentMap.entries())
        .map(([studentId, routineId]) => {
            const routine = routineMap.get(routineId)
            return {
                id: routineId,
                student_id: studentId,
                name: routine?.name ?? null,
            }
        })
        .filter((r) => routineMap.has(r.id))

    return (
        <RoutinesClient
            students={students}
            routines={routines}
            error={null}
        />
    )
}
