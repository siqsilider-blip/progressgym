'use server'

import { revalidatePath } from 'next/cache'
import { getStudentAppContext } from '@/lib/auth/student'
import { areValidUniqueIsoWeekdays } from '@/lib/routineCalendar'
import { createClient } from '@/lib/supabase/server'

export async function saveActiveTrainingWeekdays(weekdays: number[]): Promise<{
    ok: boolean
    error?: string
}> {
    const context = await getStudentAppContext()
    if (!context?.profile.student_id) {
        return { ok: false, error: 'Tu sesión venció. Volvé a iniciar sesión.' }
    }

    if (!areValidUniqueIsoWeekdays(weekdays) || weekdays.length === 0) {
        return { ok: false, error: 'Elegí días diferentes entre lunes y domingo.' }
    }

    const supabase = await createClient()
    const { error } = await supabase.rpc('save_active_training_weekdays', {
        p_weekdays: weekdays,
    })

    if (error) {
        console.error('[saveActiveTrainingWeekdays]', error)
        if (error.code === 'PGRST202' || error.code === '42883') {
            return { ok: false, error: 'Falta habilitar el calendario en la base de datos.' }
        }
        if (error.message.toLowerCase().includes('exactamente')) {
            return { ok: false, error: error.message }
        }
        return { ok: false, error: 'No pudimos guardar los días. Intentá nuevamente.' }
    }

    revalidatePath('/app')
    revalidatePath('/app/rutina')
    revalidatePath('/app/profile')
    return { ok: true }
}
