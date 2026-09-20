import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'

export type TrainerStudentSummary = {
    id: string
    first_name: string | null
    last_name: string | null
    phone: string | null
}

/**
 * El inicio usaba tres consultas idénticas para obtener los alumnos. React
 * comparte esta promesa durante el render y deja una sola lectura real.
 */
export const getTrainerStudents = cache(async (): Promise<TrainerStudentSummary[]> => {
    const user = await getServerUser()
    if (!user) return []

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone')
        .eq('trainer_id', user.id)

    if (error) {
        console.error('Error fetching trainer students:', error)
        return []
    }

    return (data ?? []) as TrainerStudentSummary[]
})
