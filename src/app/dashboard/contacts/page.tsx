import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getContacts } from './getContacts'
import { calculateContactStats } from './getContactStats'
import ContactsClient, { type Contact } from './ContactsClient'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'

export default async function ContactsPage() {
    const contacts = (await getContacts()) || []
    const stats = calculateContactStats(contacts)

    return (
        <TrainerPageShell notebook className="space-y-4 lg:space-y-7">
            <DashboardPageHeader
                notebook
                title="Contactos"
                subtitle="Consultas y próximos seguimientos"
                backHref="/dashboard"
                action={
                    <Link
                        href="/dashboard/contacts/new"
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:text-sm"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        <span className="lg:hidden">Nuevo</span>
                        <span className="hidden lg:inline">Nuevo contacto</span>
                    </Link>
                }
            />

            <ContactsClient contacts={contacts as Contact[]} stats={stats} />
        </TrainerPageShell>
    )
}
