import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChevronRight, ClipboardList, Plus, Search, X } from 'lucide-react'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'
import { getServerUser } from '@/lib/auth/server'
import { hasMatchingCriteria, normalizeStringArray } from '@/lib/templateMatching'

type TemplateRow = {
    id: string
    name: string | null
    days_per_week: number | null
    created_at: string | null
    target_goals: unknown
    target_experience_levels: unknown
    target_locations: unknown
    required_equipment: unknown
    target_session_minutes: number | null
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

    const user = await getServerUser()

    if (!user) {
        redirect('/login')
    }

    // routine_kind='template' ya alcanza como filtro completo acá -- no
    // hace falta pasar por student_routines como hace el listado de
    // programas, porque un template es siempre propiedad directa del
    // entrenador, sin capa de asignación de por medio.
    const searchQuery = searchParams?.q?.trim() ?? ''

    let templatesQuery = supabase
        .from('routines')
        .select('id, name, days_per_week, created_at, target_goals, target_experience_levels, target_locations, required_equipment, target_session_minutes')
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
        <TrainerPageShell notebook width="standard" className="space-y-4 lg:space-y-7">
            <DashboardPageHeader
                notebook
                title="Plantillas"
                subtitle={`${templateList.length} programas reutilizables`}
                backHref="/dashboard/routines"
                action={
                    <Link
                        href="/dashboard/templates/new"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-10 lg:text-sm"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo
                    </Link>
                }
            />

            <form method="get" className="flex gap-2 lg:max-w-xl" role="search">
                <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Buscar templates</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        name="q"
                        type="search"
                        defaultValue={searchQuery}
                        placeholder="Buscar por nombre…"
                        className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                    />
                </label>
                <button
                    type="submit"
                    className="h-11 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-accent"
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
                <p role="alert" className="text-sm text-destructive">
                    No se pudieron cargar los templates.
                </p>
            ) : templateList.length === 0 && searchQuery ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center lg:rounded-none lg:border-x-0 lg:border-solid lg:px-0 lg:py-5 lg:text-left">
                    <Search aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground lg:hidden" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        No encontramos templates con “{searchQuery}”.
                    </p>
                    <Link
                        href="/dashboard/templates"
                        className="mt-4 inline-block text-sm font-medium text-brand-soft hover:text-primary"
                    >
                        Ver todos
                    </Link>
                </div>
            ) : templateList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center lg:rounded-none lg:border-x-0 lg:border-solid lg:px-0 lg:py-5 lg:text-left">
                    <ClipboardList aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground lg:hidden" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        Todavía no creaste ningún template.
                    </p>
                    <Link
                        href="/dashboard/templates/new"
                        className="mt-4 inline-block text-sm font-medium text-brand-soft hover:text-primary"
                    >
                        Crear el primero →
                    </Link>
                </div>
            ) : (
                <ul className="space-y-3 lg:space-y-0 lg:border-y lg:border-border">
                    {templateList.map((template) => {
                        const stats = statsByTemplate.get(template.id) ?? { weeks: 0, exercises: 0 }
                        const isClassified = hasMatchingCriteria({
                            daysPerWeek: template.days_per_week ?? 0,
                            target_goals: normalizeStringArray(template.target_goals),
                            target_experience_levels: normalizeStringArray(template.target_experience_levels),
                            target_locations: normalizeStringArray(template.target_locations),
                            required_equipment: normalizeStringArray(template.required_equipment),
                            target_session_minutes: template.target_session_minutes,
                        })
                        return (
                            <li
                                key={template.id}
                                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:py-1.5 lg:last:border-b-0"
                            >
                                <Link href={`/dashboard/routines/${template.id}`} className="min-w-0 flex-1 rounded-md hover:text-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(13rem,auto)_minmax(11.5rem,auto)_auto] lg:items-center lg:gap-3 lg:px-2 lg:py-2.5 lg:hover:bg-accent/40">
                                    <p className="truncate text-base font-semibold text-card-foreground">
                                        {template.name ?? 'Sin nombre'}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground lg:mt-0">
                                        {template.days_per_week ?? '—'} días/semana
                                        <span className="mx-1.5 text-border">·</span>
                                        {stats.weeks} {stats.weeks === 1 ? 'semana' : 'semanas'}
                                        <span className="mx-1.5 text-border">·</span>
                                        {stats.exercises} {stats.exercises === 1 ? 'ejercicio' : 'ejercicios'}
                                    </p>
                                    <p className={`mt-1 text-[10px] font-medium lg:mt-0 lg:text-xs ${isClassified ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                                        {isClassified ? 'Listo para recomendar' : 'Faltan criterios de recomendación'}
                                    </p>
                                    <ChevronRight aria-hidden="true" className="hidden size-4 text-muted-foreground lg:block" />
                                </Link>

                                <Link
                                    href={`/dashboard/routines/${template.id}/assign-to-student`}
                                    className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:border lg:border-border lg:bg-transparent lg:text-brand-soft lg:hover:bg-accent"
                                >
                                    Asignar
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </TrainerPageShell>
    )
}
