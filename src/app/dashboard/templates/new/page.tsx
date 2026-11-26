import { redirect } from 'next/navigation'
import { createTemplate } from './actions'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'
import TemplateCriteriaFields from '@/components/TemplateCriteriaFields'
import { getServerUser } from '@/lib/auth/server'

export default async function NewTemplatePage() {
    const user = await getServerUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <TrainerPageShell notebook width="form" className="space-y-4 lg:space-y-7">
            <DashboardPageHeader
                notebook
                title="Nueva plantilla"
                subtitle="Programa reutilizable para varios alumnos"
                backHref="/dashboard/templates"
            />

            <form
                action={createTemplate}
                className="max-w-2xl space-y-5 rounded-xl border border-border bg-card p-4 lg:rounded-none lg:border-x-0 lg:bg-transparent lg:px-0 lg:py-5"
            >
                <div>
                    <label htmlFor="template-name" className="mb-2 block text-sm font-medium text-foreground">
                        Nombre del template
                    </label>
                    <input
                        id="template-name"
                        type="text"
                        name="name"
                        required
                        placeholder="Ej: Fuerza 4 días — nivel intermedio"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                    />
                </div>

                <div>
                    <label htmlFor="template-days" className="mb-2 block text-sm font-medium text-foreground">
                        Días por semana
                    </label>
                    <input
                        id="template-days"
                        type="number"
                        name="days_count"
                        min={1}
                        max={6}
                        defaultValue={4}
                        required
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring lg:max-w-36"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        Se usa como default al agregar la primera semana. Se puede
                        ajustar después desde el editor.
                    </p>
                </div>

                <div className="border-t border-border pt-5">
                    <h2 className="text-sm font-semibold text-foreground lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-2xl lg:font-normal">Criterios de recomendación</h2>
                    <p className="mb-4 mt-1 text-xs leading-5 text-muted-foreground">
                        Esto permite sugerir el template correcto cuando el alumno complete su ficha. La app nunca lo asignará sola.
                    </p>
                    <TemplateCriteriaFields />
                </div>

                <button
                    type="submit"
                    className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:w-auto"
                >
                    Crear template
                </button>
            </form>
        </TrainerPageShell>
    )
}
