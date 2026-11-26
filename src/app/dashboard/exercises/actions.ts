'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { exerciseMetricFields, getExerciseMetric, isExerciseMetric, type ExerciseMetric } from '@/lib/exerciseMetric'

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
    metric?: ExerciseMetric
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

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'trainer') {
        return { ok: false, message: 'Solo los entrenadores pueden crear ejercicios.' }
    }

    const metric = payload.metric ?? 'reps'
    if (!isExerciseMetric(metric)) {
        return { ok: false, message: 'Elegí una medida válida.' }
    }

    const { error } = await supabase.from('exercises').insert({
        trainer_id: user.id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        category: payload.category || null,
        level: payload.level || null,
        ...exerciseMetricFields(metric),
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
        .select('id, name, description, muscle_group, video_url, trainer_id, metric_type, duration_unit')
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

export async function createExerciseVariant(sourceId: string, metric: ExerciseMetric) {
    if (!sourceId || !isExerciseMetric(metric)) {
        return { ok: false as const, message: 'Elegí una medida válida.' }
    }

    const supabase = await supabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { ok: false as const, message: 'No estás logueado.' }
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'trainer') {
        return { ok: false as const, message: 'Solo los entrenadores pueden crear versiones de ejercicios.' }
    }

    const visibleOwners = `trainer_id.eq.${user.id},trainer_id.is.null`
    const { data: source, error: sourceError } = await supabase
        .from('exercises')
        .select('name, description, category, muscle_group, level, video_url, trainer_id, metric_type, duration_unit')
        .eq('id', sourceId)
        .or(visibleOwners)
        .maybeSingle()

    if (sourceError || !source) {
        return { ok: false as const, message: 'El ejercicio no está disponible en tu biblioteca.' }
    }
    if (getExerciseMetric(source) === metric) {
        return { ok: false as const, message: 'Elegí una medida distinta de la actual.' }
    }

    const suffix = { reps: 'repeticiones', seconds: 'segundos', minutes: 'minutos' }[metric]
    const baseName = source.name.trim().replace(/\s+\((?:repeticiones|segundos|minutos)\)$/i, '')
    const name = `${baseName} (${suffix})`
    const [existing, personal] = await Promise.all([
        supabase.from('exercises').select('id').or(visibleOwners).eq('name', name).limit(1).maybeSingle(),
        source.trainer_id === null
            ? supabase.from('trainer_exercise_overrides')
                .select('video_url, instructions').eq('trainer_id', user.id).eq('exercise_id', sourceId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ])

    if (existing.error || personal.error) {
        return { ok: false as const, message: 'No pudimos consultar la biblioteca. Volvé a intentar.' }
    }
    if (existing.data) {
        return { ok: false as const, message: `Ya existe «${name}» en tu biblioteca.` }
    }

    const { error } = await supabase.from('exercises').insert({
        trainer_id: user.id,
        name,
        category: source.category,
        muscle_group: source.muscle_group,
        level: source.level,
        description: personal.data?.instructions ?? source.description,
        video_url: personal.data?.video_url ?? source.video_url,
        ...exerciseMetricFields(metric),
    })

    if (error) {
        return {
            ok: false as const,
            message: error.code === '23505'
                ? `Ya existe «${name}» en tu biblioteca.`
                : 'No pudimos crear la versión. Volvé a intentar.',
        }
    }

    revalidatePath('/dashboard/exercises')
    revalidatePath('/dashboard/routines/[routineId]', 'page')
    return { ok: true as const, name }
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
