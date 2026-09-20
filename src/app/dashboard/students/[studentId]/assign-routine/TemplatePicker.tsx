'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { assignTemplateAction } from '@/app/dashboard/routines/[routineId]/assign-to-student/actions'

type TemplateOption = {
    id: string
    name: string
    daysPerWeek: number
    weeks: number
    exercises: number
}

export default function TemplatePicker({
    studentId,
    studentName,
    templates,
    hasActiveProgram,
}: {
    studentId: string
    studentName: string
    templates: TemplateOption[]
    hasActiveProgram: boolean
}) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [isPending, startTransition] = useTransition()

    const filtered = useMemo(() => {
        const term = search.trim().toLocaleLowerCase()
        if (!term) return templates
        return templates.filter((template) => template.name.toLocaleLowerCase().includes(term))
    }, [search, templates])

    function assignTemplate(template: TemplateOption) {
        if (isPending || template.exercises === 0) return

        const warning = hasActiveProgram
            ? `\n\nEl programa actual de ${studentName} quedará guardado como completado.`
            : ''

        if (!window.confirm(`¿Asignar “${template.name}” a ${studentName}?${warning}`)) return

        setError('')
        setSelectedId(template.id)

        startTransition(async () => {
            const formData = new FormData()
            formData.set('templateId', template.id)
            formData.set('studentId', studentId)

            try {
                const result = await assignTemplateAction(formData)
                if (!result.ok) {
                    setError(result.error || 'No se pudo asignar el template.')
                    setSelectedId(null)
                    return
                }

                router.push(`/dashboard/students/${studentId}?setup=invite`)
                router.refresh()
            } catch {
                setError('Ocurrió un error de conexión. Intentá nuevamente.')
                setSelectedId(null)
            }
        })
    }

    return (
        <section className="space-y-3">
            <div>
                <h2 className="text-sm font-semibold text-foreground">Elegí un template</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Se copiará completo y quedará listo para personalizar.
                </p>
            </div>

            {templates.length > 4 && (
                <label className="relative block">
                    <span className="sr-only">Buscar template</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar template..."
                        className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-indigo-500"
                    />
                </label>
            )}

            {error && (
                <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
                    {error}
                </p>
            )}

            <div className="space-y-2">
                {filtered.map((template) => {
                    const isEmpty = template.exercises === 0
                    const isSelected = selectedId === template.id && isPending

                    return (
                        <article
                            key={template.id}
                            className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">{template.name}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    {template.daysPerWeek} {template.daysPerWeek === 1 ? 'día' : 'días'}
                                    <span className="mx-1.5 text-border">·</span>
                                    {template.weeks} {template.weeks === 1 ? 'semana' : 'semanas'}
                                    <span className="mx-1.5 text-border">·</span>
                                    {template.exercises} {template.exercises === 1 ? 'ejercicio' : 'ejercicios'}
                                </p>
                                {isEmpty && (
                                    <Link
                                        href={`/dashboard/routines/${template.id}`}
                                        className="mt-1 inline-block text-[11px] font-medium text-amber-400"
                                    >
                                        Agregar ejercicios antes de asignar →
                                    </Link>
                                )}
                            </div>

                            <button
                                type="button"
                                disabled={isPending || isEmpty}
                                onClick={() => assignTemplate(template)}
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                {isSelected ? (
                                    'Asignando...'
                                ) : (
                                    <>
                                        <Check className="h-3.5 w-3.5" />
                                        Asignar
                                    </>
                                )}
                            </button>
                        </article>
                    )
                })}
            </div>

            {filtered.length === 0 && (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                    No encontramos templates con ese nombre.
                </p>
            )}
        </section>
    )
}
