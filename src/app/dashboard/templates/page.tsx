import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClipboardList, Plus } from 'lucide-react'

type TemplateRow = {
    id: string
    name: string | null
    days_per_week: number | null
    created_at: string | null
}

export default async function TemplatesListPage() {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    // routine_kind='template' ya alcanza como filtro completo acá -- no
    // hace falta pasar por student_routines como hace el listado de
    // programas, porque un template es siempre propiedad directa del
    // entrenador, sin capa de asignación de por medio.
    const { data: templates, error } = await supabase
        .from('routines')
        .select('id, name, days_per_week, created_at')
        .eq('trainer_id', user.id)
        .eq('routine_kind', 'template')
        .order('created_at', { ascending: false })

    const templateList = (templates as TemplateRow[] | null) ?? []

    return (
        <div className="px-4 pb-24 text-foreground md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-start md:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                        Templates
                    </p>
                    <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                        Tus templates
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Programas reutilizables, sin alumno asignado todavía.
                        Asignalos cuando quieras para crear una copia
                        independiente.
                    </p>
                </div>

                <Link
                    href="/dashboard/templates/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo template
                </Link>
            </div>

            {error ? (
                <p className="text-sm text-red-500">
                    No se pudieron cargar los templates.
                </p>
            ) : templateList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        Todavía no creaste ningún template.
                    </p>
                    <Link
                        href="/dashboard/templates/new"
                        className="mt-4 inline-block text-sm font-medium text-indigo-500 hover:text-indigo-400"
                    >
                        Crear el primero →
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {templateList.map((template) => (
                        <Link
                            key={template.id}
                            href={`/dashboard/routines/${template.id}`}
                            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-indigo-300 hover:bg-muted/40"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-card-foreground">
                                    {template.name ?? 'Sin nombre'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {template.days_per_week ?? '—'} días por semana
                                </p>
                            </div>

                            <span className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                                Template
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
