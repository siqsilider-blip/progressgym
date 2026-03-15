'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function supabaseServer() {
    const cookieStore = cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options)
                    })
                },
            },
        }
    )
}

const DEFAULT_DAYS = [
    { day_index: 1, title: 'Día 1 - Glúteos' },
    { day_index: 2, title: 'Día 2 - Espalda + Bíceps' },
    { day_index: 3, title: 'Día 3 - Cuádriceps + Isquios' },
    { day_index: 4, title: 'Día 4 - Pecho + Hombro + Tríceps' },
]

export async function getRoutineForStudent(studentId: string) {
    const supabase = supabaseServer()

    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr || !auth?.user) return { ok: false, message: 'No estás logueado.' }

    const { data, error } = await supabase
        .from('routines')
        .select('id, name, days_per_week, created_at, student_id')
        .eq('trainer_id', auth.user.id)
        .eq('student_id', studentId)
        .maybeSingle()

    if (error) return { ok: false, message: error.message }
    return { ok: true, routine: data ?? null }
}

export async function createRoutine4Days(studentId: string) {
    const supabase = supabaseServer()

    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr || !auth?.user) return { ok: false, message: 'No estás logueado.' }

    const { data: existing, error: existingError } = await supabase
        .from('routines')
        .select('id')
        .eq('trainer_id', auth.user.id)
        .eq('student_id', studentId)
        .maybeSingle()

    if (existingError) {
        return { ok: false, message: existingError.message }
    }

    if (existing) {
        return { ok: true, routineId: existing.id }
    }

    const { data: routine, error: routineErr } = await supabase
        .from('routines')
        .insert({
            trainer_id: auth.user.id,
            student_id: studentId,
            name: 'Rutina 4 días',
            days_per_week: 4,
        })
        .select('id')
        .single()

    if (routineErr || !routine) {
        return { ok: false, message: routineErr?.message ?? 'No se pudo crear la rutina.' }
    }

    const rows = DEFAULT_DAYS.map((d) => ({
        routine_id: routine.id,
        day_index: d.day_index,
        title: d.title,
    }))

    const { error: daysErr } = await supabase.from('routine_days').insert(rows)

    if (daysErr) {
        return { ok: false, message: daysErr.message }
    }

    revalidatePath('/dashboard/routines')
    revalidatePath(`/dashboard/routines/${routine.id}`)

    return { ok: true, routineId: routine.id }
}

export async function getRoutineDays(routineId: string) {
    const supabase = supabaseServer()

    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr || !auth?.user) return { ok: false, message: 'No estás logueado.' }

    const { data, error } = await supabase
        .from('routine_days')
        .select('id, day_index, title')
        .eq('routine_id', routineId)
        .order('day_index', { ascending: true })

    if (error) return { ok: false, message: error.message }
    return { ok: true, days: data ?? [] }
}

export async function renameRoutineDay(payload: { routineDayId: string; title: string }) {
    const supabase = supabaseServer()

    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr || !auth?.user) return { ok: false, message: 'No estás logueado.' }

    const title = payload.title.trim()
    if (!title) return { ok: false, message: 'El título no puede estar vacío.' }

    const { error } = await supabase
        .from('routine_days')
        .update({ title })
        .eq('id', payload.routineDayId)

    if (error) return { ok: false, message: error.message }

    revalidatePath('/dashboard/routines')
    return { ok: true }
}