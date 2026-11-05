import Link from 'next/link'
import { getContacts } from './getContacts'
import { calculateContactStats } from './getContactStats'
import ContactsClient, { type Contact } from './ContactsClient'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

export default async function ContactsPage() {
    const contacts = (await getContacts()) || []
    const stats = calculateContactStats(contacts)

    return (
        <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
            <DashboardPageHeader
                title="Contactos"
                subtitle="Seguimiento comercial"
                backHref="/dashboard"
                action={
                    <Link
                        href="/dashboard/contacts/new"
                        className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary"
                    >
                        + Nuevo
                    </Link>
                }
            />

            <ContactsClient contacts={contacts as Contact[]} stats={stats} />
        </div>
    )
}
