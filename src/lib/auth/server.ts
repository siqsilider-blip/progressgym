import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Mantiene la verificación remota y segura de Supabase, pero evita repetirla
 * desde el layout, el menú y los distintos loaders durante el mismo render.
 */
export const getServerUser = cache(async () => {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    return error ? null : user
})

