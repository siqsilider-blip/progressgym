'use client'

import Link from 'next/link'
import { use } from 'react'
import { useFormStatus } from 'react-dom'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'
import ContactFields from '../ContactFields'
import { createContact } from '../actions'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
            {pending ? 'Guardando...' : 'Crear contacto'}
        </button>
    )
}

export default function NewContactPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { message } = use(searchParams)

    return (
        <TrainerPageShell notebook className="space-y-4 lg:space-y-7">
            <DashboardPageHeader
                notebook
                title="Nuevo contacto"
                backHref="/dashboard/contacts"
            />

            <form action={createContact} className="max-w-3xl space-y-5 rounded-xl border border-border bg-card p-4 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:bg-transparent lg:px-0 lg:pt-6">
                <ContactFields />

                {typeof message === 'string' && message && (
                    <p role="alert" className="border-l-2 border-destructive px-3 py-2 text-sm text-destructive">
                        {message}
                    </p>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                    <Link href="/dashboard/contacts" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        Cancelar
                    </Link>
                    <SubmitButton />
                </div>
            </form>
        </TrainerPageShell>
    )
}
