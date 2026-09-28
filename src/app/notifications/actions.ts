'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'

type UserRole = 'trainer' | 'student'

function notificationHome(role: UserRole) {
    return role === 'trainer' ? '/dashboard/notifications' : '/app/notifications'
}

function safeNotificationHref(href: string | null, role: UserRole) {
    const allowedPrefix = role === 'trainer' ? '/dashboard' : '/app'
    return href?.startsWith(allowedPrefix) ? href : notificationHome(role)
}

async function getNotificationContext() {
    const user = await getServerUser()
    if (!user) return null

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role !== 'trainer' && profile?.role !== 'student') return null
    return { user, supabase, role: profile.role as UserRole }
}

function refreshNotificationSurfaces(role: UserRole) {
    if (role === 'trainer') {
        revalidatePath('/dashboard', 'layout')
        revalidatePath('/dashboard/notifications')
    } else {
        revalidatePath('/app', 'layout')
        revalidatePath('/app/notifications')
    }
}

export async function markInternalNotificationReadAndOpen(formData: FormData) {
    const context = await getNotificationContext()
    if (!context) redirect('/login')

    const notificationId = String(formData.get('notificationId') ?? '')
    if (!notificationId) redirect(notificationHome(context.role))

    const { data: notification } = await context.supabase
        .from('internal_notifications')
        .select('id, href')
        .eq('id', notificationId)
        .eq('recipient_user_id', context.user.id)
        .maybeSingle()

    if (!notification) redirect(notificationHome(context.role))

    await context.supabase
        .from('internal_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id)
        .eq('recipient_user_id', context.user.id)
        .is('read_at', null)

    refreshNotificationSurfaces(context.role)
    redirect(safeNotificationHref(notification.href, context.role))
}

export async function markAllInternalNotificationsRead() {
    const context = await getNotificationContext()
    if (!context) return

    await context.supabase
        .from('internal_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_user_id', context.user.id)
        .is('read_at', null)

    refreshNotificationSurfaces(context.role)
}
