import { redirect } from 'next/navigation'
import NotificationCenter, { type NotificationRow } from '@/components/notifications/NotificationCenter'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import { getStudentAppContext } from '@/lib/auth/student'
import { createClient } from '@/lib/supabase/server'

export default async function StudentNotificationsPage() {
    const context = await getStudentAppContext()
    if (!context) redirect('/login')

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('internal_notifications')
        .select('id, type, title, body, href, read_at, created_at')
        .eq('recipient_user_id', context.user.id)
        .order('created_at', { ascending: false })
        .limit(80)

    return (
        <main className="mx-auto max-w-lg space-y-4 px-4 pb-28 pt-5">
            <StudentPageHeader
                title="Avisos"
                subtitle="Novedades de tu entrenador"
                back
            />
            {error ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-5 text-amber-500">
                    No pudimos cargar los avisos. Volvé a intentar en unos segundos.
                </div>
            ) : (
                <NotificationCenter notifications={(data as NotificationRow[] | null) ?? []} />
            )}
        </main>
    )
}
