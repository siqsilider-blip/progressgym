'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import ExerciseProgressCard from '@/app/dashboard/students/ExerciseProgressCard'
import type { ExerciseProgress } from '@/app/dashboard/students/getStudentExerciseProgress'
import type { WeightUnit } from '@/lib/weight'

const PREVIEW_SIZE = 4
const PAGE_SIZE = 6
const navigationButton = 'min-h-11 rounded-xl border border-border bg-card px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40'

type Props = {
    exercises: ExerciseProgress[]
    weightUnit: WeightUnit
}

function normalizeSearch(value: string) {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()
}

export default function StudentExerciseProgressList({ exercises, weightUnit }: Props) {
    const [showAll, setShowAll] = useState(false)
    const [query, setQuery] = useState('')
    const [onlyImproved, setOnlyImproved] = useState(false)
    const [page, setPage] = useState(0)
    const [openId, setOpenId] = useState<string | null>(null)
    const listId = useId()
    const resultsRef = useRef<HTMLParagraphElement>(null)

    const highlights = useMemo(() => [...exercises].sort((a, b) => {
        const byGain = b.progressKg - a.progressKg
        const aLatest = a.logs[a.logs.length - 1]?.date ?? ''
        const bLatest = b.logs[b.logs.length - 1]?.date ?? ''
        return byGain || bLatest.localeCompare(aLatest) || a.exerciseName.localeCompare(b.exerciseName, 'es')
    }).slice(0, PREVIEW_SIZE), [exercises])

    const catalog = useMemo(() => [...exercises]
        .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'es'))
        .map((exercise) => ({ exercise, searchName: normalizeSearch(exercise.exerciseName) })), [exercises])

    const searchTerm = normalizeSearch(query)
    const results = catalog.filter(({ exercise, searchName }) =>
        (!onlyImproved || exercise.progressKg > 0) && searchName.includes(searchTerm)
    )
    const pageCount = Math.ceil(results.length / PAGE_SIZE)
    const currentPage = Math.min(page, Math.max(0, pageCount - 1))
    const offset = currentPage * PAGE_SIZE
    const visibleExercises = showAll
        ? results.slice(offset, offset + PAGE_SIZE).map(({ exercise }) => exercise)
        : highlights
    const canBrowse = exercises.length > PREVIEW_SIZE

    function resetResults() {
        setOpenId(null)
        setPage(0)
    }

    function toggleAll() {
        setShowAll(!showAll)
        setQuery('')
        setOnlyImproved(false)
        resetResults()
    }

    function changePage(nextPage: number) {
        setPage(nextPage)
        setOpenId(null)
        resultsRef.current?.focus()
    }

    return (
        <div className="space-y-3">
            {canBrowse && (
                <button
                    type="button"
                    aria-controls={listId}
                    aria-expanded={showAll}
                    onClick={toggleAll}
                    className={`${navigationButton} flex w-full items-center justify-between gap-2 text-primary`}
                >
                    <span className="inline-flex items-center gap-2">
                        {showAll && <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                        {showAll ? 'Volver al resumen' : `Ver todos los ejercicios (${exercises.length})`}
                    </span>
                    {!showAll && <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
            )}

            <div id={listId} className="space-y-2">
                {showAll && (
                    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                        <label className="block text-sm font-semibold text-foreground">
                            Buscar ejercicio
                            <span className="relative mt-1 block">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <input
                                    type="search"
                                    className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background pl-9 pr-3 text-base font-normal text-foreground outline-none focus:border-primary"
                                    placeholder="Ej. Jalón al pecho"
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value)
                                        resetResults()
                                    }}
                                />
                            </span>
                        </label>
                        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm text-foreground">
                            <input
                                type="checkbox"
                                className="h-5 w-5 rounded accent-primary"
                                checked={onlyImproved}
                                onChange={(event) => {
                                    setOnlyImproved(event.target.checked)
                                    resetResults()
                                }}
                            />
                            Solo con aumento de carga
                        </label>
                    </div>
                )}

                {showAll && (
                    <p ref={resultsRef} tabIndex={-1} role="status" className="scroll-mt-20 text-xs font-semibold text-muted-foreground">
                        {results.length > 0
                            ? `${offset + 1}–${offset + visibleExercises.length} de ${results.length} ${results.length === 1 ? 'ejercicio' : 'ejercicios'}`
                            : 'No encontramos ejercicios con esa búsqueda o filtro.'}
                    </p>
                )}

                {visibleExercises.map((exercise) => (
                    <ExerciseProgressCard
                        key={exercise.exerciseId}
                        exercise={exercise}
                        weightUnit={weightUnit}
                        studentDisclosure={{
                            open: openId === exercise.exerciseId,
                            onToggle: () => setOpenId((id) => id === exercise.exerciseId ? null : exercise.exerciseId),
                        }}
                    />
                ))}

                {showAll && pageCount > 1 && (
                    <nav aria-label="Páginas de ejercicios" className="flex items-center justify-between gap-2 pt-1">
                        <button type="button" className={`${navigationButton} text-foreground`} disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>
                            Anterior
                        </button>
                        <span className="text-center text-xs font-semibold text-muted-foreground">{currentPage + 1} de {pageCount}</span>
                        <button type="button" className={`${navigationButton} text-foreground`} disabled={currentPage + 1 === pageCount} onClick={() => changePage(currentPage + 1)}>
                            Siguiente
                        </button>
                    </nav>
                )}
            </div>
        </div>
    )
}
