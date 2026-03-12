'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

export async function createExercise(payload: {
    name: string
    description?: string
    category?: string
    level?: string
}) {
    const supabase = supabaseServer()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return { ok: false, message: 'No estás logueado.' }

    // (Opcional pero recomendado) aseguramos que exista el trainer
    // Si tu tabla trainers tiene otras columnas NOT NULL, decime y lo adapto.
    await supabase.from('trainers').upsert({ id: user.id }, { onConflict: 'id' })

    const { error } = await supabase.from('exercises').insert({
        trainer_id: user.id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        category: payload.category || null,
        level: payload.level || null,
    })

    if (error) return { ok: false, message: error.message }

    revalidatePath('/dashboard/exercises')
    return { ok: true as const }
}

export async function listExercises() {
    const supabase = supabaseServer()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return { ok: false as const, message: 'No estás logueado.', items: [] }

    const { data, error } = await supabase
        .from('exercises')
        .select('id,name,description,category,level')
        .eq('trainer_id', user.id)
        .order('name', { ascending: true })

    if (error) return { ok: false as const, message: error.message, items: [] }

    return { ok: true as const, items: data ?? [] }
}

export async function deleteExercise(id: string) {
    const supabase = supabaseServer()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return { ok: false, message: 'No estás logueado.' }

    const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id)
        .eq('trainer_id', user.id)

    if (error) return { ok: false, message: error.message }

    revalidatePath('/dashboard/exercises')
    return { ok: true as const }
}