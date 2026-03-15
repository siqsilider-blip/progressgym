import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RoutinesClient from './RoutinesClient'

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
}

type Routine = {
    id: string
    student_id: string
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
        .select('id, first_name, last_name')
        .order('created_at', { ascending: false })

    const { data: routinesData, error: routinesError } = await supabase
        .from('routines')
        .select('id, student_id')
        .eq('trainer_id', user.id)

    const error = studentsError?.message || routinesError?.message || null

    const students: Student[] = (studentsData ?? []) as Student[]
    const routines: Routine[] = (routinesData ?? []) as Routine[]

    return (
        <RoutinesClient
            students={students}
            routines={routines}
            error={error}
        />
    )
}