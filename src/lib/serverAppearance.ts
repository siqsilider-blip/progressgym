import { cache } from 'react'
import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/auth/server'
import { appearanceCookieName, isAppearance, resolveAppearance, type Appearance } from '@/lib/appearance'
import { createClient } from '@/lib/supabase/server'

export const getAppearance = cache(async (): Promise<Appearance> => {
    const cookieStore = await cookies()
    if (cookieStore.getAll().length === 0) return 'brand'

    const user = await getServerUser()
    if (!user) return 'brand'

    const preference = cookieStore.get(appearanceCookieName(user.id))?.value
    if (isAppearance(preference)) return preference

    // En el ajuste anterior el tema oscuro era la paleta rosa de la marca.
    const supabase = await createClient()
    const { data } = await supabase.from('profiles').select('theme').eq('id', user.id).maybeSingle()
    return resolveAppearance(preference, data?.theme)
})
