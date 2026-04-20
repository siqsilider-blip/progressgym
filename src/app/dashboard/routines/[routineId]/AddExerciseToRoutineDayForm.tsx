'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addExerciseToRoutineDay } from './actions'

type ExerciseOption = {
    id: string
    name: string
    muscle_group: string | null
    category: string | null
    metric_type: 'reps' | 'time' | null
}

type Props = {
    routineId: string
    routineDayId: string
    exerciseOptions: ExerciseOption[]
    defaultSets: number
    defaultReps: number
    defaultRest: number
}

export default function AddExerciseToRoutineDayForm({
    routineId,
    routineDayId,
    exerciseOptions,
    defaultSets,
    defaultReps,
    defaultRest,
}: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [expanded, setExpanded] = useState(false)
    const [selectedExerciseName, setSelectedExerciseName] = useState('')
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [sets, setSets] = useState(String(defaultSets))
    const [reps, setReps] = useState(String(defaultReps))
    const [restSeconds, setRestSeconds] = useState(String(defaultRest))
    const [feedback, setFeedback] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' })
    const [isPending, startTransition] = useTransition()

    const containerRef = useRef<HTMLDivElement | null>(null)
    const searchInputRef = useRef<HTMLInputElement | null>(null)

    const currentDayId = searchParams.get('day') || routineDayId

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (open) {
            setTimeout(() => searchInputRef.current?.focus(), 0)
        } else {
            setSearch('')
        }
    }, [open])

    const filteredExercises = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return exerciseOptions
        return exerciseOptions.filter((ex) => {
            const name = ex.name.toLowerCase()
            const cat = ex.category?.toLowerCase() ?? ''
            const mg = ex.muscle_group?.toLowerCase() ?? ''
            return name.includes(term) || cat.includes(term) || mg.includes(term)
        })
    }, [exerciseOptions, search])

    const selectedExercise = useMemo(
        () => exerciseOptions.find((ex) => ex.name === selectedExerciseName) ?? null,
        [exerciseOptions, selectedExerciseName]
    )

    const isTimeExercise = selectedExercise?.metric_type === 'time'

    function resetExercise() {
        setSelectedExerciseName('')
        setSearch('')
        setOpen(false)
        setSets(String(defaultSets))
        setReps(String(defaultReps))
        setRestSeconds(String(defaultRest))
    }

    function handleCollapse() {
        resetExercise()
        setFeedback({ type: 'idle', message: '' })
        setExpanded(false)
    }

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault()
        if (isPending) return

        if (!selectedExerciseName.trim()) {
            setFeedback({ type: 'error', message: 'Seleccioná un ejercicio' })
            return
        }

        const formData = new FormData()
        formData.set('routineId', routineId)
        formData.set('routineDayId', routineDayId)
        formData.set('dayId', currentDayId)
        formData.set('exercise_name', selectedExerciseName)
        formData.set('sets', sets)
        formData.set('reps', reps)
        formData.set('rest_seconds', restSeconds)

        startTransition(async () => {
            const result = await addExerciseToRoutineDay(formData)

            if (!result?.ok) {
                setFeedback({ type: 'error', message: result?.error || 'No se pudo agregar el ejercicio' })
                return
            }

            setFeedback({ type: 'success', message: '✓ Ejercicio agregado' })
            resetExercise()
            router.refresh()
        })
    }

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 py-2.5 text-sm font-medium text-indigo-600 transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-indigo-500/40 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Agregar ejercicio
            </button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {/* Header del form expandido */}
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Nuevo ejercicio
                </p>
                <button
                    type="button"
                    onClick={handleCollapse}
                    className="text-xs text-muted-foreground transition hover:text-foreground"
                >
                    Cancelar
                </button>
            </div>

            {/* Selector de ejercicio */}
            <div ref={containerRef} className="relative">
                <button
                    type="button"
                    onClick={() => { if (!isPending) setOpen((prev) => !prev) }}
                    disabled={isPending}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground outline-none transition hover:border-indigo-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                >
                    {selectedExerciseName || <span className="text-muted-foreground">Seleccionar ejercicio</span>}
                </button>

                {open && (
                    <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-background shadow-xl">
                        <div className="border-b border-border p-2.5">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre o categoría..."
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground"
                            />
                        </div>

                        <div className="max-h-64 overflow-y-auto p-1.5">
                            {filteredExercises.length > 0 ? (
                                filteredExercises.map((ex) => {
                                    const isSelected = ex.name === selectedExerciseName
                                    const tag = ex.category ?? ex.muscle_group ?? null
                                    return (
                                        <button
                                            key={ex.id}
                                            type="button"
                                            onClick={() => {
                                                if (isPending) return
                                                setSelectedExerciseName(ex.name)
                                                setOpen(false)
                                                setFeedback({ type: 'idle', message: '' })
                                            }}
                                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                                                isSelected
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <span className="font-medium">{ex.name}</span>
                                            {tag && (
                                                <span className={`shrink-0 text-xs ${isSelected ? 'text-indigo-200' : 'text-muted-foreground'}`}>
                                                    {tag}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })
                            ) : (
                                <p className="px-3 py-3 text-sm text-muted-foreground">No se encontraron ejercicios.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Campos numéricos */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Series</label>
                    <input
                        name="sets"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        disabled={isPending}
                        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                        {isTimeExercise ? 'Duración (min)' : 'Reps'}
                    </label>
                    <input
                        name="reps"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        disabled={isPending}
                        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Descanso (s)</label>
                    <input
                        name="rest_seconds"
                        type="number"
                        min="0"
                        step="15"
                        value={restSeconds}
                        onChange={(e) => setRestSeconds(e.target.value)}
                        disabled={isPending}
                        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                </div>
            </div>

            {/* Feedback */}
            {feedback.type !== 'idle' && (
                <p className={`text-xs font-medium ${feedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {feedback.message}
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60"
            >
                {isPending ? 'Agregando...' : 'Agregar'}
            </button>
        </form>
    )
}
