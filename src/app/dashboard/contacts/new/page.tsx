'use client';
import { use } from "react";

import { createContact } from '@/app/dashboard/contacts/actions'
import { useFormStatus } from 'react-dom'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import DashboardBackButton from '@/components/dashboard/DashboardBackButton'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-medium text-white transition-all ${pending
                    ? 'cursor-not-allowed bg-indigo-400'
                    : 'bg-indigo-600 shadow-lg shadow-indigo-600/20 hover:bg-indigo-500'
                }`}
        >
            {pending ? 'Guardando...' : 'Crear contacto'}
        </button>
    )
}

export default function NewContactPage(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>
    }
) {
    const searchParams = use(props.searchParams);
    const message = searchParams?.message

    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-2xl space-y-4">
                <DashboardPageHeader
                    title="Nuevo contacto"
                    subtitle="Potencial cliente para seguimiento"
                    backHref="/dashboard/contacts"
                />

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <form className="space-y-4" action={createContact}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Nombre completo
                            </label>
                            <input
                                name="full_name"
                                required
                                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Teléfono
                            </label>
                            <input
                                name="phone"
                                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                                placeholder="Ej: 11 2345 6789"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Objetivo
                            </label>
                            <input
                                name="objective"
                                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                                placeholder="Ej: Bajar de peso / ganar músculo"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Estado
                                </label>
                                <select
                                    name="status"
                                    defaultValue="new"
                                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                                >
                                    <option value="new">Nuevo</option>
                                    <option value="contacted">Contactado</option>
                                    <option value="interested">Interesado</option>
                                    <option value="negotiation">Negociación</option>
                                    <option value="inactive">Inactivo</option>
                                    <option value="lost">Perdido</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Nivel de interés
                                </label>
                                <select
                                    name="temperature"
                                    defaultValue="warm"
                                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                                >
                                    <option value="cold">Interés bajo</option>
                                    <option value="warm">Interés medio</option>
                                    <option value="hot">Interés alto</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Próximo seguimiento
                            </label>
                            <input
                                type="date"
                                name="next_follow_up_at"
                                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Notas
                            </label>
                            <textarea
                                name="notes"
                                rows={3}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                                placeholder="Ej: Viene de Instagram, quiere entrenar 3 veces por semana..."
                            />
                        </div>

                        {message && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                                {message}
                            </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                            <DashboardBackButton fallbackHref="/dashboard/contacts" label="Cancelar" />

                            <SubmitButton />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
