'use server'

import { cookies } from 'next/headers'
import { appearanceCookieName, isAppearance, type Appearance } from '@/lib/appearance'
import { getServerUser } from '@/lib/auth/server'

export async function saveAppearance(value: Appearance): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!isAppearance(value)) return { ok: false, error: 'Elegí una apariencia válida.' }

    const user = await getServerUser()
    if (!user) return { ok: false, error: 'Volvé a iniciar sesión para guardar la apariencia.' }

    const cookieStore = await cookies()
    cookieStore.set(appearanceCookieName(user.id), value, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
    })

    return { ok: true }
}
