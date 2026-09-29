import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'

type UserRole = 'trainer' | 'student'

function notificationHome(role: UserRole) {
    return role === 'trainer' ? '/dashboard/notifications' : '/app/notifications'
}

function safeNotificationHref(href: string | null, role: UserRole) {
    const allowedPrefix = role === 'trainer' ? '/dashboard' : '/app'
    const isAllowed = href === allowedPrefix
        || href?.startsWith(`${allowedPrefix}/`)
        || href?.startsWith(`${allowedPrefix}?`)

    return isAllowed && href ? href : notificationHome(role)
}

function redirectWithinApp(request: NextRequest, path: string) {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto')
        ?? (host?.includes('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https')
    const origin = host ? `${protocol}://${host}` : request.nextUrl.origin

    return NextResponse.redirect(new URL(path, origin))
}

export async function GET(request: NextRequest) {
    const user = await getServerUser()
    if (!user) return redirectWithinApp(request, '/login')

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role !== 'trainer' && profile?.role !== 'student') {
        return redirectWithinApp(request, '/login')
    }

    const role = profile.role as UserRole
    const notificationId = request.nextUrl.searchParams.get('id')
    if (!notificationId) {
        return redirectWithinApp(request, notificationHome(role))
    }

    const { data: notification } = await supabase
        .from('internal_notifications')
        .select('id, href')
        .eq('id', notificationId)
        .eq('recipient_user_id', user.id)
        .maybeSingle()

    if (!notification) {
        return redirectWithinApp(request, notificationHome(role))
    }

    await supabase
        .from('internal_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id)
        .eq('recipient_user_id', user.id)
        .is('read_at', null)

    if (role === 'trainer') {
        revalidatePath('/dashboard', 'layout')
        revalidatePath('/dashboard/notifications')
    } else {
        revalidatePath('/app', 'layout')
        revalidatePath('/app/notifications')
    }

    const target = safeNotificationHref(notification.href, role)
    return redirectWithinApp(request, target)
}
