import { redirect } from 'next/navigation'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import NotificationCenter, { type NotificationRow } from '@/components/notifications/NotificationCenter'
import { getServerUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'

export default async function TrainerNotificationsPage() {
    const user = await getServerUser()
    if (!user) redirect('/login')

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('internal_notifications')
        .select('id, type, title, body, href, read_at, created_at')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80)

    return (
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:px-6 md:py-7">
            <DashboardPageHeader
                title="Avisos"
                subtitle="Mensajes y controles que requieren tu atención"
                backHref="/dashboard"
            />
            {error ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-5 text-amber-400">
                    No pudimos cargar los avisos. Volvé a intentar en unos segundos.
                </div>
            ) : (
                <NotificationCenter notifications={(data as NotificationRow[] | null) ?? []} />
            )}
        </main>
    )
}
