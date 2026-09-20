import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type ServerIdentity = {
    id: string
    email: string | null
}

/**
 * Verifica el JWT y evita repetir la validación desde el layout, el menú y
 * los distintos loaders durante el mismo render. getClaims usa las claves
 * públicas cacheables del proyecto y evita una consulta a Auth por pantalla.
 */
export const getServerUser = cache(async (): Promise<ServerIdentity | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()
    const claims = data?.claims

    if (error || !claims?.sub) return null

    return {
        id: claims.sub,
        email: typeof claims.email === 'string' ? claims.email : null,
    }
})
