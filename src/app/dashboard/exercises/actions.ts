'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

async function supabaseServer() {
    const cookieStore = await cookies()

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

export async function createExercise(payload: {
    name: string
    description?: string
    category?: string
    level?: string
    metric_type?: 'reps' | 'time'
    video_url?: string
}) {
    const supabase = await supabaseServer()

    const {
        data: { user },
        error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
        return { ok: false, message: 'No estás logueado.' }
    }

    await supabase.from('trainers').upsert({ id: user.id }, { onConflict: 'id' })

    const metricType = payload.metric_type === 'time' ? 'time' : 'reps'

    const { error } = await supabase.from('exercises').insert({
        trainer_id: user.id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        category: payload.category || null,
        level: payload.level || null,
        metric_type: metricType,
        video_url: payload.video_url?.trim() || null,
    })

    if (error) return { ok: false, message: error.message }

    revalidatePath('/dashboard/exercises')
    return { ok: true as const }
}

export async function listExercises() {
    const supabase = await supabaseServer()

    const {
        data: { user },
        error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
        return {
            ok: false as const,
            message: 'No estás logueado.',
            items: [],
        }
    }

    const { data, error } = await supabase
        .from('exercises')
        .select('id, name, description, muscle_group, video_url, trainer_id')
        .or(`trainer_id.eq.${user.id},trainer_id.is.null`)
        .order('name', { ascending: true })

    if (error) {
        return { ok: false as const, message: error.message, items: [] }
    }

    const { data: overrides } = await supabase
        .from('trainer_exercise_overrides')
        .select('exercise_id, video_url, instructions')
        .eq('trainer_id', user.id)

    const overrideByExerciseId = new Map(
        (overrides ?? []).map((override) => [override.exercise_id, override])
    )

    const items = (data ?? []).map((exercise) => {
        const override = exercise.trainer_id === null
            ? overrideByExerciseId.get(exercise.id)
            : null

        return {
            ...exercise,
            description: override?.instructions ?? exercise.description,
            video_url: override?.video_url ?? exercise.video_url,
            is_personalized: Boolean(override),
        }
    })

    return { ok: true as const, items }
}

export async function updateExercise(id: string, payload: {
    name: string
    description?: string
    muscle_group?: string
    video_url?: string
}) {
    const supabase = await supabaseServer()

    const {
        data: { user },
        error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
        return { ok: false, message: 'No estás logueado.' }
    }

    const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('id, trainer_id')
        .eq('id', id)
        .maybeSingle()

    if (exerciseError || !exercise) {
        return { ok: false, message: 'No se encontró el ejercicio.' }
    }

    let error: { message: string } | null = null

    if (exercise.trainer_id === null) {
        const videoUrl = payload.video_url?.trim() || null
        const instructions = payload.description?.trim() || null

        if (!videoUrl && !instructions) {
            const result = await supabase
                .from('trainer_exercise_overrides')
                .delete()
                .eq('trainer_id', user.id)
                .eq('exercise_id', id)
            error = result.error
        } else {
            const result = await supabase
                .from('trainer_exercise_overrides')
                .upsert({
                    trainer_id: user.id,
                    exercise_id: id,
                    video_url: videoUrl,
                    instructions,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'trainer_id,exercise_id' })
            error = result.error
        }
    } else if (exercise.trainer_id === user.id) {
        const result = await supabase
            .from('exercises')
            .update({
                name: payload.name.trim(),
                description: payload.description?.trim() || null,
                muscle_group: payload.muscle_group || null,
                video_url: payload.video_url?.trim() || null,
            })
            .eq('id', id)
            .eq('trainer_id', user.id)
        error = result.error
    } else {
        return { ok: false, message: 'No tenés permiso para editar este ejercicio.' }
    }

    if (error) {
        const missingMigration = error.message.includes('trainer_exercise_overrides')
        return {
            ok: false,
            message: missingMigration
                ? 'Falta activar la personalización de ejercicios en Supabase.'
                : error.message,
        }
    }

    revalidatePath('/dashboard/exercises')
    return { ok: true as const }
}

export async function deleteExercise(id: string) {
    const supabase = await supabaseServer()

    const {
        data: { user },
        error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
        return { ok: false, message: 'No estás logueado.' }
    }

    const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id)
        .eq('trainer_id', user.id)

    if (error) return { ok: false, message: error.message }

    revalidatePath('/dashboard/exercises')
    return { ok: true as const }
}
