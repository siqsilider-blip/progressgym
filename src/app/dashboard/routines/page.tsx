import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RoutinesClient from './RoutinesClient'
import { getServerUser } from '@/lib/auth/server'

export default async function RoutinesPage() {
    const supabase = await createClient()

    const user = await getServerUser()

    if (!user) {
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
        return <RoutinesClient students={[]} routines={[]} error={null} />
    }

    const studentIds = students.map((s) => s.id)

    const [{ data: assignments }, { data: routinesData }] = await Promise.all([
        supabase
            .from('student_routines')
            .select('student_id, routine_id')
            .in('student_id', studentIds)
            .eq('status', 'active'),
        supabase
            .from('routines')
            .select('id, name')
            .eq('trainer_id', user.id),
    ])

    const assignmentMap = new Map<string, string>()
    for (const a of assignments ?? []) {
        if (a.routine_id) assignmentMap.set(a.student_id, a.routine_id)
    }

    const routineMap = new Map<string, { id: string; name: string | null }>()

    for (const r of routinesData ?? []) {
        if (r.id) routineMap.set(r.id, { id: r.id, name: r.name ?? null })
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
