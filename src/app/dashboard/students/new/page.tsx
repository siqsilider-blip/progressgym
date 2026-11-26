'use client';
import { use } from "react";

import { createStudent } from '@/app/dashboard/students/actions'
import { useFormStatus } from 'react-dom'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import DashboardBackButton from '@/components/dashboard/DashboardBackButton'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'

const fieldClass = 'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary lg:rounded-md'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-md"
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
        <TrainerPageShell notebook width="form" className="space-y-4 lg:space-y-7">
            <div className="mx-auto max-w-2xl space-y-4 lg:space-y-7">
                <DashboardPageHeader
                    notebook
                    title="Agregar alumno"
                    subtitle="Primero le enviás el acceso para conocer sus objetivos"
                    backHref="/dashboard/students"
                />

                <div className="rounded-xl border border-border bg-card p-4 lg:rounded-none lg:border-x-0 lg:bg-transparent lg:px-0 lg:py-6">
                    <form className="space-y-4" action={createStudent}>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="new-student-name" className="text-sm font-medium text-foreground">
                                    Nombre
                                </label>
                                <input
                                    id="new-student-name"
                                    name="first_name"
                                    autoComplete="given-name"
                                    required
                                    className={fieldClass}
                                    placeholder="Ej: Juan"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="new-student-last-name" className="text-sm font-medium text-foreground">
                                    Apellido
                                </label>
                                <input
                                    id="new-student-last-name"
                                    name="last_name"
                                    autoComplete="family-name"
                                    required
                                    className={fieldClass}
                                    placeholder="Ej: Pérez"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="new-student-email" className="text-sm font-medium text-foreground">
                                Email
                            </label>
                            <input
                                id="new-student-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                className={fieldClass}
                                placeholder="ejemplo@mail.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="new-student-phone" className="text-sm font-medium text-foreground">
                                WhatsApp
                            </label>
                            <input
                                id="new-student-phone"
                                name="phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                className={fieldClass}
                                placeholder="Ej: +54 9 11 2345-6789"
                            />
                            <p className="text-xs text-muted-foreground">
                                Se usa para abrir mensajes de seguimiento ya preparados.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="new-student-plan" className="text-sm font-medium text-foreground">
                                Estado inicial del plan
                            </label>
                            <select
                                id="new-student-plan"
                                name="active_plan"
                                defaultValue="active"
                                className={fieldClass}
                            >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </div>

                        {message && (
                            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
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
        </TrainerPageShell>
    )
}
