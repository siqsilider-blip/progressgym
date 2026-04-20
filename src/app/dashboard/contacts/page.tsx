import Link from 'next/link'
import { getContacts } from './getContacts'
import { getContactStats } from './getContactStats'
import ContactsClient, { type Contact } from './ContactsClient'

export default async function ContactsPage() {
    const contacts = (await getContacts()) || []
    const stats = await getContactStats()

    return (
        <div className="space-y-4 p-4 pb-24 md:p-8">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Contactos</h1>
                    <p className="text-sm text-muted-foreground">
                        Seguimiento comercial y alumnos inactivos
                    </p>
                </div>

                <Link
                    href="/dashboard/contacts/new"
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-indigo-500/50 px-3 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                >
                    + Nuevo
                </Link>
            </div>

            <ContactsClient contacts={contacts as Contact[]} stats={stats} />
        </div>
    )
}
