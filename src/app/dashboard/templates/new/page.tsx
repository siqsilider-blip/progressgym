import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createTemplate } from './actions'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

export default async function NewTemplatePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="mx-auto max-w-2xl space-y-4 px-4 pb-24 text-foreground md:p-6">
            <DashboardPageHeader
                title="Nuevo template"
                subtitle="Programa reutilizable para varios alumnos"
                backHref="/dashboard/templates"
            />

            <form
                action={createTemplate}
                className="max-w-md space-y-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
            >
                <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                        Nombre del template
                    </label>
                    <input
                        type="text"
                        name="name"
                        required
                        placeholder="Ej: Fuerza 4 días — nivel intermedio"
                        className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                        Días por semana
                    </label>
                    <input
                        type="number"
                        name="days_count"
                        min={1}
                        max={6}
                        defaultValue={4}
                        required
                        className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        Se usa como default al agregar la primera semana. Se puede
                        ajustar después desde el editor.
                    </p>
                </div>

                <button
                    type="submit"
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                    Crear template
                </button>
            </form>
        </div>
    )
}
