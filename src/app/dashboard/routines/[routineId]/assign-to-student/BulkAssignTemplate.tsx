'use client'

import * as React from 'react'
import Link from 'next/link'

type Student = {
    id: string
    name: string
    hasActiveProgram: boolean
}

type Props = {
    templateId: string
    students: Student[]
    assignAction: (formData: FormData) => Promise<{ ok: boolean; studentId?: string; error?: string }>
}

type Result = { ok: boolean; error?: string }

export default function BulkAssignTemplate({ templateId, students, assignAction }: Props) {
    const [search, setSearch] = React.useState('')
    const [selected, setSelected] = React.useState<Set<string>>(new Set())
    const [results, setResults] = React.useState<Record<string, Result>>({})
    const [isAssigning, setIsAssigning] = React.useState(false)
    const [processed, setProcessed] = React.useState(0)

    const filtered = React.useMemo(() => {
        const term = search.trim().toLocaleLowerCase()
        if (!term) return students
        return students.filter((student) => student.name.toLocaleLowerCase().includes(term))
    }, [search, students])

    const selectedStudents = students.filter((student) => selected.has(student.id))
    const selectedWithActiveProgram = selectedStudents.filter((student) => student.hasActiveProgram).length
    const allFilteredSelected = filtered.length > 0 && filtered.every((student) => selected.has(student.id))
    const successCount = Object.values(results).filter((result) => result.ok).length
    const failureCount = Object.values(results).filter((result) => !result.ok).length

    function toggleStudent(studentId: string) {
        setSelected((current) => {
            const next = new Set(current)
            if (next.has(studentId)) next.delete(studentId)
            else next.add(studentId)
            return next
        })
    }

    function toggleFiltered() {
        setSelected((current) => {
            const next = new Set(current)
            if (allFilteredSelected) filtered.forEach((student) => next.delete(student.id))
            else filtered.forEach((student) => next.add(student.id))
            return next
        })
    }

    async function assignSelected() {
        if (selectedStudents.length === 0 || isAssigning) return

        const activeWarning = selectedWithActiveProgram > 0
            ? `\n\n${selectedWithActiveProgram} ya ${selectedWithActiveProgram === 1 ? 'tiene' : 'tienen'} un programa activo. El programa actual quedará guardado como completado.`
            : ''

        if (!confirm(`¿Asignar este template a ${selectedStudents.length} ${selectedStudents.length === 1 ? 'alumno' : 'alumnos'}?${activeWarning}`)) return

        setIsAssigning(true)
        setProcessed(0)
        setResults({})

        const nextResults: Record<string, Result> = {}
        for (const student of selectedStudents) {
            const formData = new FormData()
            formData.set('templateId', templateId)
            formData.set('studentId', student.id)

            try {
                const result = await assignAction(formData)
                nextResults[student.id] = result.ok
                    ? { ok: true }
                    : { ok: false, error: result.error || 'No se pudo asignar.' }
            } catch {
                nextResults[student.id] = { ok: false, error: 'Error de conexión.' }
            }

            setResults({ ...nextResults })
            setProcessed((value) => value + 1)
        }

        setSelected(new Set(Object.entries(nextResults)
            .filter(([, result]) => !result.ok)
            .map(([studentId]) => studentId)))
        setIsAssigning(false)
    }

    return (
        <div className="space-y-3">
            <div className="sticky top-0 z-10 space-y-2 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar alumno..."
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={isAssigning || filtered.length === 0}
                        onClick={toggleFiltered}
                        className="text-xs font-medium text-indigo-500 disabled:opacity-50"
                    >
                        {allFilteredSelected ? 'Quitar visibles' : 'Seleccionar visibles'}
                    </button>
                    <button
                        type="button"
                        disabled={isAssigning || selectedStudents.length === 0}
                        onClick={assignSelected}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isAssigning
                            ? `Asignando ${processed}/${selectedStudents.length}...`
                            : `Asignar seleccionados (${selectedStudents.length})`}
                    </button>
                </div>
                {selectedWithActiveProgram > 0 && !isAssigning && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        {selectedWithActiveProgram} seleccionados ya tienen un programa activo.
                    </p>
                )}
                {!isAssigning && Object.keys(results).length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2 text-xs">
                        <span className="font-medium text-foreground">{successCount} asignados · {failureCount} con error</span>
                        <Link href="/dashboard/students" className="font-semibold text-indigo-500">Ver alumnos</Link>
                    </div>
                )}
            </div>

            {filtered.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No se encontraron alumnos.</p>
            ) : filtered.map((student) => {
                const isSelected = selected.has(student.id)
                const result = results[student.id]
                return (
                    <label
                        key={student.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${isSelected ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04]'}`}
                    >
                        <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isAssigning || result?.ok}
                            onChange={() => toggleStudent(student.id)}
                            className="h-5 w-5 shrink-0 accent-indigo-600"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-card-foreground">{student.name}</p>
                            {result?.ok ? (
                                <p className="mt-0.5 text-xs font-medium text-emerald-500">Asignado correctamente ✓</p>
                            ) : result ? (
                                <p className="mt-0.5 text-xs font-medium text-red-500">{result.error}</p>
                            ) : student.hasActiveProgram ? (
                                <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Ya tiene un programa activo</p>
                            ) : (
                                <p className="mt-0.5 text-xs text-muted-foreground">Disponible para asignar</p>
                            )}
                        </div>
                    </label>
                )
            })}
        </div>
    )
}
