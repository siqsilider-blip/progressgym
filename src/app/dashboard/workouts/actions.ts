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

export async function createWorkout(payload: {
    student_id: string
    date?: string // YYYY-MM-DD
    name?: string | null
    notes?: string | null
}) {
    const supabase = supabaseServer()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return { ok: false, message: 'No estás logueado.' }

    const { error } = await supabase.from('workouts').insert({
        trainer_id: user.id,
        student_id: payload.student_id,
        date: payload.date ?? new Date().toISOString().slice(0, 10),
        name: payload.name ?? null,
        notes: payload.notes ?? null,
    })

    if (error) return { ok: false, message: error.message }

    revalidatePath('/dashboard/workouts')
    return { ok: true }
}

export async function deleteWorkout(id: string) {
    const supabase = supabaseServer()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return { ok: false, message: 'No estás logueado.' }

    const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id)
        .eq('trainer_id', user.id)

    if (error) return { ok: false, message: error.message }

    revalidatePath('/dashboard/workouts')
    return { ok: true }
}

export async function addWorkoutExercise(payload: {
    workout_id: string
    exercise_id: string
    order?: number
    sets?: number | null
    reps?: string | null
    weight?: number | null
    rir?: number | null
    rest_seconds?: number | null
    notes?: string | null
}) {
    const supabase = supabaseServer()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return { ok: false, message: 'No estás logueado.' }

    // No hace falta traer workout: la RLS ya valida que sea tuyo
    const { error } = await supabase.from('workout_exercises').insert({
        workout_id: payload.workout_id,
        exercise_id: payload.exercise_id,
        order: payload.order ?? 1,
        sets: payload.sets ?? null,
        reps: payload.reps ?? null,
        weight: payload.weight ?? null,
        rir: payload.rir ?? null,
        rest_seconds: payload.rest_seconds ?? null,
        notes: payload.notes ?? null,
    })

    if (error) return { ok: false, message: error.message }

    revalidatePath('/dashboard/workouts')
    return { ok: true }
}

export async function deleteWorkoutExercise(id: string) {
    const supabase = supabaseServer()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return { ok: false, message: 'No estás logueado.' }

    const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', id)

    if (error) return { ok: false, message: error.message }

    revalidatePath('/dashboard/workouts')
    return { ok: true }
}