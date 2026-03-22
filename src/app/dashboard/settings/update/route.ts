import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    const supabase = await createClient()
    const formData = await req.formData()

    const name = (formData.get('name') as string) ?? ''
    const weight_unit = (formData.get('weight_unit') as string) ?? 'kg'
    const theme = (formData.get('theme') as string) ?? 'dark'

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            name,
            email: user.email ?? '',
            weight_unit,
            theme,
        })

    if (error) {
        console.error('SETTINGS UPDATE ERROR:', error)
        return NextResponse.redirect(
            new URL('/dashboard/settings?message=error', req.url)
        )
    }

    const cookieStore = await cookies()
    cookieStore.set('theme', theme, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
    })

    return NextResponse.redirect(
        new URL('/dashboard/settings?message=success', req.url)
    )
}