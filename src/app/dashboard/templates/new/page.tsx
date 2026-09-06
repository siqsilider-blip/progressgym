import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createTemplate } from './actions'

export default async function NewTemplatePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="px-4 pb-6 text-foreground md:p-8">
            <div className="mb-6 flex flex-col gap-2 md:mb-8">
                <Link
                    href="/dashboard/templates"
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    ← Volver a templates
                </Link>

                <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                    Templates
                </p>

                <h1 className="text-2xl font-bold md:text-3xl">Nuevo template</h1>

                <p className="text-sm text-muted-foreground">
                    Un template no pertenece a ningún alumno todavía. Lo armás una
                    sola vez (meses, semanas, días, ejercicios) y después lo
                    asignás a los alumnos que quieras, cada uno con su copia
                    independiente.
                </p>
            </div>

            <form
                action={createTemplate}
                className="max-w-md space-y-5 rounded-2xl border border-border bg-card p-5"
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
