import { redirect } from 'next/navigation'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'
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
        <TrainerPageShell notebook width="standard" className="space-y-4 lg:space-y-7">
            <DashboardPageHeader
                notebook
                title="Avisos"
                subtitle="Mensajes y controles que requieren tu atención"
                backHref="/dashboard"
            />
            {error ? (
                <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm leading-5 text-destructive lg:rounded-none lg:border-x-0 lg:px-0">
                    No pudimos cargar los avisos. Volvé a intentar en unos segundos.
                </p>
            ) : (
                <NotificationCenter notebook notifications={(data as NotificationRow[] | null) ?? []} />
            )}
        </TrainerPageShell>
    )
}
