'use client';
import { use } from "react";

import { createStudent } from '@/app/dashboard/students/actions'
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
            {pending ? 'Creando...' : 'Crear alumno'}
        </button>
    )
}

export default function NewStudentPage(
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
                    title="Agregar alumno"
                    subtitle="Datos básicos para comenzar"
                    backHref="/dashboard/students"
                />

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <form className="space-y-4" action={createStudent}>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Nombre
                                </label>
                                <input
                                    name="first_name"
                                    required
                                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                    placeholder="Ej: Juan"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Apellido
                                </label>
                                <input
                                    name="last_name"
                                    required
                                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                    placeholder="Ej: Pérez"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Email
                            </label>
                            <input
                                name="email"
                                type="email"
                                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                placeholder="ejemplo@mail.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                WhatsApp
                            </label>
                            <input
                                name="phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                placeholder="Ej: +54 9 11 2345-6789"
                            />
                            <p className="text-xs text-zinc-500">
                                Se usa para abrir mensajes de seguimiento ya preparados.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Estado inicial del plan
                            </label>
                            <select
                                name="active_plan"
                                defaultValue="active"
                                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                            >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </div>

                        {message && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                                {message}
                            </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                            <DashboardBackButton fallbackHref="/dashboard/students" label="Cancelar" />

                            <SubmitButton />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
