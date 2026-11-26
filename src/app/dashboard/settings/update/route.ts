import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const supabase = await createClient()
    const formData = await req.formData()

    const name = (formData.get('name') as string) ?? ''
    const weight_unit = (formData.get('weight_unit') as string) ?? 'kg'

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
        })

    if (error) {
        console.error('SETTINGS UPDATE ERROR:', error)
        return NextResponse.redirect(
            new URL('/dashboard/settings?message=error', req.url)
        )
    }

    return NextResponse.redirect(
        new URL('/dashboard/settings?message=success', req.url)
    )
}
