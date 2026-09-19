import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClipboardList, Plus, Search, X } from 'lucide-react'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

type TemplateRow = {
    id: string
    name: string | null
    days_per_week: number | null
    created_at: string | null
}

type TemplateStats = {
    weeks: number
    exercises: number
}

type PageProps = {
    searchParams?: Promise<{
        q?: string
    }>
}

export default async function TemplatesListPage(props: PageProps) {
    const searchParams = await props.searchParams;
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
    const searchQuery = searchParams?.q?.trim() ?? ''

    let templatesQuery = supabase
        .from('routines')
        .select('id, name, days_per_week, created_at')
        .eq('trainer_id', user.id)
        .eq('routine_kind', 'template')
        .order('created_at', { ascending: false })

    if (searchQuery) {
        templatesQuery = templatesQuery.ilike('name', `%${searchQuery}%`)
    }

    const { data: templates, error } = await templatesQuery

    const templateList = (templates as TemplateRow[] | null) ?? []
    const templateIds = templateList.map((template) => template.id)
    const statsByTemplate = new Map<string, TemplateStats>(
        templateIds.map((id) => [id, { weeks: 0, exercises: 0 }])
    )

    if (templateIds.length > 0) {
        const [{ data: weeks }, { data: days }] = await Promise.all([
            supabase
                .from('routine_weeks')
                .select('id, routine_id')
                .in('routine_id', templateIds),
            supabase
                .from('routine_days')
                .select('id, routine_id')
                .in('routine_id', templateIds),
        ])

        for (const week of weeks ?? []) {
            const stats = statsByTemplate.get(week.routine_id)
            if (stats) stats.weeks += 1
        }

        const dayToTemplate = new Map((days ?? []).map((day) => [day.id, day.routine_id]))
        const dayIds = Array.from(dayToTemplate.keys())

        if (dayIds.length > 0) {
            const batches: string[][] = []
            for (let index = 0; index < dayIds.length; index += 200) {
                batches.push(dayIds.slice(index, index + 200))
            }

            const exerciseResults = await Promise.all(batches.map((batch) =>
                supabase
                    .from('routine_day_exercises')
                    .select('routine_day_id')
                    .in('routine_day_id', batch)
            ))

            const exerciseRows = exerciseResults.flatMap((result) => result.data ?? [])

            for (const row of exerciseRows) {
                const templateId = dayToTemplate.get(row.routine_day_id)
                const stats = templateId ? statsByTemplate.get(templateId) : null
                if (stats) stats.exercises += 1
            }
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-4 px-4 pb-24 text-foreground md:p-6">
            <DashboardPageHeader
                title="Templates"
                subtitle={`${templateList.length} programas reutilizables`}
                backHref="/dashboard/routines"
                action={
                    <Link
                        href="/dashboard/templates/new"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo
                    </Link>
                }
            />

            <form method="get" className="flex gap-2" role="search">
                <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Buscar templates</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        name="q"
                        type="search"
                        defaultValue={searchQuery}
                        placeholder="Buscar por nombre…"
                        className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                </label>
                <button
                    type="submit"
                    className="h-11 rounded-xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:bg-muted"
                >
                    Buscar
                </button>
                {searchQuery && (
                    <Link
                        href="/dashboard/templates"
                        aria-label="Limpiar búsqueda"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </Link>
                )}
            </form>

            {error ? (
                <p className="text-sm text-red-500">
                    No se pudieron cargar los templates.
                </p>
            ) : templateList.length === 0 && searchQuery ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        No encontramos templates con “{searchQuery}”.
                    </p>
                    <Link
                        href="/dashboard/templates"
                        className="mt-4 inline-block text-sm font-medium text-indigo-500 hover:text-indigo-400"
                    >
                        Ver todos
                    </Link>
                </div>
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
                <div className="space-y-2">
                    {templateList.map((template) => {
                        const stats = statsByTemplate.get(template.id) ?? { weeks: 0, exercises: 0 }
                        return (
                            <div
                                key={template.id}
                                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-indigo-500/30 hover:bg-white/[0.04]"
                            >
                                <Link href={`/dashboard/routines/${template.id}`} className="min-w-0 flex-1">
                                    <p className="truncate text-base font-semibold text-card-foreground">
                                        {template.name ?? 'Sin nombre'}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {template.days_per_week ?? '—'} días/semana
                                        <span className="mx-1.5 text-border">·</span>
                                        {stats.weeks} {stats.weeks === 1 ? 'semana' : 'semanas'}
                                        <span className="mx-1.5 text-border">·</span>
                                        {stats.exercises} {stats.exercises === 1 ? 'ejercicio' : 'ejercicios'}
                                    </p>
                                </Link>

                                <Link
                                    href={`/dashboard/routines/${template.id}/assign-to-student`}
                                    className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
                                >
                                    Asignar
                                </Link>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
