'use client'

import { useState, useMemo, useRef, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import ExerciseProgressChart from '../../../../components/ExerciseProgressChart'

export type Block = 'activation' | 'main' | 'closing'

export type ExerciseOption = {
    id: string
    name: string
    muscle_group: string | null
    category: string | null
    metric_type: 'reps' | 'time' | null
}

export type DayExercise = {
    id: string
    exercise_id: string
    sets: number | null
    reps: number | null
    rest_seconds: number | null
    position: number | null
    block: Block
    exercise: { name: string; muscle_group: string | null; metric_type: 'reps' | 'time' | null } | { name: string; muscle_group: string | null; metric_type: 'reps' | 'time' | null }[] | null
}

export type ExerciseLog = {
    id: string
    student_id: string
    routine_day_exercise_id: string
    weight: number | null
    reps: number | null
    performed_at: string | null
    created_at?: string | null
}

type Props = {
    routineId: string
    routineDayId: string
    exercises: DayExercise[]
    exerciseOptions: ExerciseOption[]
    defaultSets: number
    defaultReps: number
    defaultRest: number
    addAction: (fd: FormData) => Promise<any>
    createExerciseAction: (input: { routineId: string; name: string; category?: string; metricType?: 'reps' | 'time' }) => Promise<{ ok: boolean; exercise?: ExerciseOption; error?: string }>
    updateAction: (fd: FormData) => Promise<any>
    moveAction: (fd: FormData) => Promise<{ ok: boolean; error?: string }>
    deleteAction: (fd: FormData) => Promise<void>
    weekId: string
    logsByExercise: Record<string, ExerciseLog[]>
    weightUnit: WeightUnit
}

const BLOCK_META = [
    { id: 'activation' as Block, label: 'Activación', emoji: '⚡' },
    { id: 'main' as Block, label: 'Bloque principal', emoji: '💪' },
    { id: 'closing' as Block, label: 'Cierre', emoji: '🧘' },
]

export default function DayBlockEditor({
    routineId,
    routineDayId,
    exercises,
    exerciseOptions,
    defaultSets,
    defaultReps,
    defaultRest,
    addAction,
    createExerciseAction,
    updateAction,
    moveAction,
    deleteAction,
    weekId,
    logsByExercise,
    weightUnit
}: Props) {
    const [openAddBlock, setOpenAddBlock] = useState<Block | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const [openBlocks, setOpenBlocks] = useState<Record<Block, boolean>>({
        activation: false,
        main: true,
        closing: false
    })

    return (
        <div className="space-y-4">
            {BLOCK_META.map((meta) => {
                const blockExercises = exercises.filter(ex => ex.block === meta.id)
                const isAdding = openAddBlock === meta.id

                return (
                    <details
                        key={meta.id}
                        open={openBlocks[meta.id]}
                        className="group rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
                    >
                        <summary
                            className="cursor-pointer list-none flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition"
                            onClick={(e) => {
                                e.preventDefault()
                                setOpenBlocks(prev => ({ ...prev, [meta.id]: !prev[meta.id] }))
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-base">{meta.emoji}</span>
                                <h3 className="text-sm font-bold text-card-foreground">{meta.label}</h3>
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                                    {blockExercises.length}
                                </span>
                            </div>
                            <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>

                        <div className="p-4 pt-2 space-y-2 border-t border-border">
                            {blockExercises.map((exercise, index) => (
                                <ExerciseRow
                                    key={exercise.id}
                                    exercise={exercise}
                                    exerciseOptions={exerciseOptions}
                                    index={index}
                                    isEditing={editingId === exercise.id}
                                    onEdit={() => setEditingId(exercise.id)}
                                    onCancelEdit={() => setEditingId(null)}
                                    updateAction={updateAction}
                                    moveAction={moveAction}
                                    deleteAction={deleteAction}
                                    routineId={routineId}
                                    dayId={routineDayId}
                                    weekId={weekId}
                                    logs={logsByExercise[exercise.id] || []}
                                    weightUnit={weightUnit}
                                    isPending={isPending}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < blockExercises.length - 1}
                                    startTransition={startTransition}
                                />
                            ))}

                            {!isAdding ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenAddBlock(meta.id)
                                        setOpenBlocks(prev => ({ ...prev, [meta.id]: true }))
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 py-2.5 text-sm font-medium text-indigo-600 transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-indigo-500/40 dark:text-indigo-400 dark:hover:bg-indigo-500/10 mt-3"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Agregar ejercicio
                                </button>
                            ) : (
                                <div className="mt-3 rounded-xl border border-border p-3 bg-muted/10">
                                    <AddExerciseForm
                                        block={meta.id}
                                        routineId={routineId}
                                        routineDayId={routineDayId}
                                        exerciseOptions={exerciseOptions}
                                        defaultSets={defaultSets}
                                        defaultReps={defaultReps}
                                        defaultRest={defaultRest}
                                        onCancel={() => setOpenAddBlock(null)}
                                        addAction={addAction}
                                        createExerciseAction={createExerciseAction}
                                        isPending={isPending}
                                        startTransition={startTransition}
                                    />
                                </div>
                            )}
                        </div>
                    </details>
                )
            })}
        </div>
    )
}

function ExerciseRow({
    exercise,
    exerciseOptions,
    index,
    isEditing,
    onEdit,
    onCancelEdit,
    updateAction,
    moveAction,
    deleteAction,
    routineId,
    dayId,
    weekId,
    logs,
    weightUnit,
    isPending,
    canMoveUp,
    canMoveDown,
    startTransition
}: {
    exercise: DayExercise
    exerciseOptions: ExerciseOption[]
    index: number
    isEditing: boolean
    onEdit: () => void
    onCancelEdit: () => void
    updateAction: (fd: FormData) => Promise<any>
    moveAction: (fd: FormData) => Promise<{ ok: boolean; error?: string }>
    deleteAction: (fd: FormData) => Promise<void>
    routineId: string
    dayId: string
    weekId: string
    logs: ExerciseLog[]
    weightUnit: WeightUnit
    isPending: boolean
    canMoveUp: boolean
    canMoveDown: boolean
    startTransition: (cb: () => void) => void
}) {
    const relation = Array.isArray(exercise.exercise) ? exercise.exercise[0] : exercise.exercise
    const isTime = relation?.metric_type === 'time'
    const router = useRouter()
    const searchParams = useSearchParams()

    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [replacementName, setReplacementName] = useState(relation?.name ?? '')
    const replacementExercise = exerciseOptions.find(
        (option) => option.name.toLocaleLowerCase() === replacementName.trim().toLocaleLowerCase()
    )

    if (isEditing) {
        return (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-50/30 p-3 dark:bg-indigo-950/20">
                <form action={(fd) => {
                    setErrorMsg(null)
                    startTransition(async () => {
                        try {
                            const res = await updateAction(fd)
                            if (res && res.ok === false) {
                                setErrorMsg(res.error || 'Error al guardar')
                            } else {
                                onCancelEdit()
                                router.refresh()
                            }
                        } catch (err: any) {
                            setErrorMsg(err.message || 'Error inesperado')
                        }
                    })
                }} className="space-y-3">
                    <input type="hidden" name="routineId" value={routineId} />
                    <input type="hidden" name="dayId" value={dayId} />
                    <input type="hidden" name="weekId" value={weekId} />
                    <input type="hidden" name="exerciseRowId" value={exercise.id} />
                    <input type="hidden" name="replacementExerciseId" value={replacementExercise?.id ?? ''} />
                    {searchParams.get('month') && <input type="hidden" name="monthId" value={searchParams.get('month')!} />}

                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground">{relation?.name}</h4>
                        <button type="button" onClick={onCancelEdit} className="text-xs text-muted-foreground hover:text-foreground">
                            Cancelar
                        </button>
                    </div>

                    <div>
                        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Ejercicio</label>
                        <input
                            list={`exercise-options-${exercise.id}`}
                            value={replacementName}
                            onChange={(event) => setReplacementName(event.target.value)}
                            placeholder="Buscar por nombre..."
                            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <datalist id={`exercise-options-${exercise.id}`}>
                            {exerciseOptions.map((option) => (
                                <option key={option.id} value={option.name}>{option.muscle_group || option.category || ''}</option>
                            ))}
                        </datalist>
                        {replacementName.trim() && !replacementExercise && (
                            <p className="mt-1 text-[10px] text-amber-500">Elegí una opción exacta de la lista.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Bloque</label>
                            <select name="block" defaultValue={exercise.block} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                                {BLOCK_META.map(b => (
                                    <option key={b.id} value={b.id}>{b.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Series</label>
                            <input name="sets" type="number" min="1" step="1" defaultValue={exercise.sets ?? ''} required className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{isTime ? 'Min' : 'Reps'}</label>
                            <input name="reps" type="number" min="1" step="1" defaultValue={exercise.reps ?? ''} required className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Desc (s)</label>
                            <input name="rest_seconds" type="number" min="0" step="15" defaultValue={exercise.rest_seconds ?? ''} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                    </div>

                    {errorMsg && (
                        <p className="text-xs font-medium text-red-500">{errorMsg}</p>
                    )}

                    <div className="flex gap-2">
                        <button type="submit" disabled={isPending || !replacementExercise} className="h-9 flex-1 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                            Guardar
                        </button>
                        <button formAction={(fd) => {
                            fd.append('exerciseId', exercise.id)
                            startTransition(async () => {
                                try {
                                    await deleteAction(fd)
                                    onCancelEdit()
                                    router.refresh()
                                } catch (err) {
                                    // ignore
                                }
                            })
                        }} disabled={isPending} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </form>

                <ExerciseLogs exercise={exercise} logs={logs} weightUnit={weightUnit} relation={relation} />
            </div>
        )
    }

    const move = (direction: 'up' | 'down') => {
        setErrorMsg(null)
        const formData = new FormData()
        formData.set('routineId', routineId)
        formData.set('exerciseRowId', exercise.id)
        formData.set('direction', direction)
        startTransition(async () => {
            try {
                const result = await moveAction(formData)
                if (!result.ok) {
                    setErrorMsg(result.error || 'No se pudo cambiar el orden.')
                    return
                }
                router.refresh()
            } catch {
                setErrorMsg('Ocurrió un error de conexión.')
            }
        })
    }

    return (
        <div>
          <div
            onClick={onEdit}
            className="flex items-center gap-2 rounded-lg border border-transparent p-2 transition hover:border-border hover:bg-muted/50 cursor-pointer group"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-500/10 text-[10px] font-bold text-indigo-500">
                {index + 1}
            </div>
            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-medium text-foreground">
                    {relation?.name ?? 'Ejercicio'}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        {exercise.sets ?? '-'} × {isTime ? exercise.reps != null ? `${exercise.reps}m` : '-' : `${exercise.reps ?? '-'}r`}
                    </span>
                    {exercise.rest_seconds && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground text-muted-foreground">
                            {exercise.rest_seconds}s
                        </span>
                    )}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
                <button
                    type="button"
                    aria-label={`Subir ${relation?.name ?? 'ejercicio'}`}
                    title="Subir dentro del bloque"
                    disabled={isPending || !canMoveUp}
                    onClick={() => move('up')}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-25"
                >
                    <span aria-hidden="true">↑</span>
                </button>
                <button
                    type="button"
                    aria-label={`Bajar ${relation?.name ?? 'ejercicio'}`}
                    title="Bajar dentro del bloque"
                    disabled={isPending || !canMoveDown}
                    onClick={() => move('down')}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-25"
                >
                    <span aria-hidden="true">↓</span>
                </button>
            </div>
            <div className="hidden shrink-0 opacity-0 transition group-hover:opacity-100 sm:block">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
            </div>
          </div>
          {errorMsg && <p role="alert" className="px-2 pb-1 text-xs font-medium text-red-500">{errorMsg}</p>}
        </div>
    )
}

function AddExerciseForm({
    block,
    routineId,
    routineDayId,
    exerciseOptions,
    defaultSets,
    defaultReps,
    defaultRest,
    onCancel,
    addAction,
    createExerciseAction,
    isPending,
    startTransition
}: {
    block: Block
    routineId: string
    routineDayId: string
    exerciseOptions: ExerciseOption[]
    defaultSets: number
    defaultReps: number
    defaultRest: number
    onCancel: () => void
    addAction: (fd: FormData) => Promise<any>
    createExerciseAction: (input: { routineId: string; name: string; category?: string; metricType?: 'reps' | 'time' }) => Promise<{ ok: boolean; exercise?: ExerciseOption; error?: string }>
    isPending: boolean
    startTransition: (cb: () => void) => void
}) {
    const [selectedExerciseName, setSelectedExerciseName] = useState('')
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [availableExercises, setAvailableExercises] = useState(exerciseOptions)
    const [showQuickCreate, setShowQuickCreate] = useState(false)
    const [newMetricType, setNewMetricType] = useState<'reps' | 'time'>('reps')
    const [createError, setCreateError] = useState<string | null>(null)
    const [sets, setSets] = useState(String(defaultSets))
    const [reps, setReps] = useState(String(defaultReps))
    const [restSeconds, setRestSeconds] = useState(String(defaultRest))

    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const containerRef = useRef<HTMLDivElement | null>(null)
    const searchInputRef = useRef<HTMLInputElement | null>(null)

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
            setShowQuickCreate(false)
            setCreateError(null)
        }
    }, [open])

    const categories = useMemo(() => Array.from(new Set(
        availableExercises
            .map((exercise) => exercise.muscle_group || exercise.category)
            .filter((value): value is string => Boolean(value))
    )).sort((a, b) => a.localeCompare(b, 'es')), [availableExercises])

    const filteredExercises = useMemo(() => {
        const term = search.trim().toLowerCase()
        return availableExercises.filter((ex) => {
            const name = ex.name.toLowerCase()
            const cat = ex.category?.toLowerCase() ?? ''
            const mg = ex.muscle_group?.toLowerCase() ?? ''
            const matchesSearch = !term || name.includes(term) || cat.includes(term) || mg.includes(term)
            const matchesCategory = categoryFilter === 'all' || ex.muscle_group === categoryFilter || ex.category === categoryFilter
            return matchesSearch && matchesCategory
        })
    }, [availableExercises, search, categoryFilter])

    const selectedExercise = useMemo(
        () => availableExercises.find((ex) => ex.name === selectedExerciseName) ?? null,
        [availableExercises, selectedExerciseName]
    )

    const exactSearchMatch = availableExercises.some(
        (exercise) => exercise.name.toLocaleLowerCase() === search.trim().toLocaleLowerCase()
    )

    const isTimeExercise = selectedExercise?.metric_type === 'time'
    const router = useRouter()

    return (
        <form action={(fd) => {
            setErrorMsg(null)
            startTransition(async () => {
                try {
                    const res = await addAction(fd)
                    if (res && res.ok === false) {
                        setErrorMsg(res.error || 'Error al agregar')
                    } else {
                        onCancel()
                        router.refresh()
                    }
                } catch (err: any) {
                    setErrorMsg(err.message || 'Error inesperado')
                }
            })
        }} className="space-y-3">
            <input type="hidden" name="routineId" value={routineId} />
            <input type="hidden" name="routineDayId" value={routineDayId} />
            <input type="hidden" name="exercise_name" value={selectedExerciseName} />
            <input type="hidden" name="block" value={block} />

            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Nuevo ejercicio</p>
                <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            </div>

            <div ref={containerRef} className="relative">
                {open ? (
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') setOpen(false)
                        }}
                        placeholder="Buscar ejercicio..."
                        aria-label="Buscar ejercicio"
                        className="w-full rounded-lg border border-indigo-500 bg-background px-3 py-2 text-xs font-medium text-foreground outline-none ring-1 ring-indigo-500 placeholder:text-muted-foreground"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium text-foreground outline-none transition hover:border-indigo-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                        {selectedExerciseName || <span className="text-muted-foreground">Seleccionar ejercicio</span>}
                    </button>
                )}

                {open && (
                    <div className="relative z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-xl">
                        <div className="border-b border-border p-2">
                            {categories.length > 1 && (
                                <select
                                    value={categoryFilter}
                                    onChange={(event) => setCategoryFilter(event.target.value)}
                                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-indigo-500"
                                >
                                    <option value="all">Todos los grupos</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className={showQuickCreate ? 'p-1' : 'max-h-40 overflow-y-auto p-1'}>
                            {filteredExercises.length > 0 ? (
                                filteredExercises.map((ex) => {
                                    const isSelected = ex.name === selectedExerciseName
                                    const tag = ex.category ?? ex.muscle_group ?? null
                                    return (
                                        <button
                                            key={ex.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedExerciseName(ex.name)
                                                setOpen(false)
                                            }}
                                            className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                                                isSelected ? 'bg-indigo-600 text-white' : 'text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <span className="font-medium">{ex.name}</span>
                                            {tag && <span className={`shrink-0 text-[10px] ${isSelected ? 'text-indigo-200' : 'text-muted-foreground'}`}>{tag}</span>}
                                        </button>
                                    )
                                })
                            ) : (
                                <p className="px-2 py-2 text-xs text-muted-foreground">No se encontraron ejercicios.</p>
                            )}
                            {search.trim() && !exactSearchMatch && !showQuickCreate && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowQuickCreate(true)
                                        setCreateError(null)
                                        setTimeout(() => containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
                                    }}
                                    className="mt-1 w-full rounded-md border border-dashed border-indigo-500/50 px-2 py-2 text-left text-xs font-semibold text-indigo-500 hover:bg-indigo-500/10"
                                >
                                    + Crear &ldquo;{search.trim()}&rdquo;
                                </button>
                            )}
                            {showQuickCreate && (
                                <div className="mt-1 space-y-2 rounded-md border border-indigo-500/30 bg-indigo-500/5 p-2">
                                    <p className="truncate text-xs font-semibold text-foreground">Nuevo: {search.trim()}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={categoryFilter === 'all' ? '' : categoryFilter}
                                            onChange={(event) => setCategoryFilter(event.target.value || 'all')}
                                            className="h-8 rounded-md border border-border bg-background px-2 text-[11px] text-foreground"
                                        >
                                            <option value="">Sin grupo</option>
                                            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                                        </select>
                                        <select
                                            value={newMetricType}
                                            onChange={(event) => setNewMetricType(event.target.value as 'reps' | 'time')}
                                            className="h-8 rounded-md border border-border bg-background px-2 text-[11px] text-foreground"
                                        >
                                            <option value="reps">Repeticiones</option>
                                            <option value="time">Tiempo</option>
                                        </select>
                                    </div>
                                    {createError && <p className="text-[10px] font-medium text-red-500">{createError}</p>}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={isPending || !search.trim()}
                                            onClick={() => {
                                                const name = search.trim()
                                                setCreateError(null)
                                                startTransition(async () => {
                                                    const result = await createExerciseAction({
                                                        routineId,
                                                        name,
                                                        category: categoryFilter === 'all' ? undefined : categoryFilter,
                                                        metricType: newMetricType,
                                                    })
                                                    if (!result.ok || !result.exercise) {
                                                        setCreateError(result.error || 'No se pudo crear.')
                                                        return
                                                    }
                                                    setAvailableExercises((current) => current.some((item) => item.id === result.exercise!.id)
                                                        ? current
                                                        : [...current, result.exercise!].sort((a, b) => a.name.localeCompare(b.name, 'es')))
                                                    setSelectedExerciseName(result.exercise.name)
                                                    setShowQuickCreate(false)
                                                    setOpen(false)
                                                })
                                            }}
                                            className="h-8 flex-1 rounded-md bg-indigo-600 text-[11px] font-semibold text-white disabled:opacity-50"
                                        >
                                            {isPending ? 'Creando...' : 'Crear y seleccionar'}
                                        </button>
                                        <button type="button" onClick={() => setShowQuickCreate(false)} className="h-8 rounded-md px-2 text-[11px] text-muted-foreground">Cancelar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Series</label>
                    <input name="sets" type="number" min="1" step="1" required value={sets} onChange={(e) => setSets(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{isTimeExercise ? 'Min' : 'Reps'}</label>
                    <input name="reps" type="number" min="1" step="1" required value={reps} onChange={(e) => setReps(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Descanso (s)</label>
                    <input name="rest_seconds" type="number" min="0" step="15" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
            </div>

            {errorMsg && (
                <p className="text-xs font-medium text-red-500">{errorMsg}</p>
            )}

            <button type="submit" disabled={isPending || !selectedExerciseName} className="h-9 w-full rounded-lg bg-indigo-600 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
                Agregar al bloque
            </button>
        </form>
    )
}

function ExerciseLogs({ exercise, logs, weightUnit, relation }: { exercise: DayExercise, logs: ExerciseLog[], weightUnit: WeightUnit, relation: any }) {
    if (!logs || logs.length === 0) return null

    const latestLog = logs[0]
    const isTime = relation?.metric_type === 'time'
    const bestWeight = Math.max(...logs.map((log) => log.weight || 0), 0)
    const isPR = !isTime && latestLog?.weight !== null && latestLog?.weight === bestWeight && logs.length > 1

    const dailyLogs = Object.values(
        logs.reduce<Record<string, ExerciseLog>>((acc, log) => {
            const date = (log.performed_at ?? log.id).split('T')[0]
            if (!acc[date]) {
                acc[date] = log
            } else {
                const best = isTime ? (acc[date].reps ?? 0) : (acc[date].weight ?? 0)
                const candidate = isTime ? (log.reps ?? 0) : (log.weight ?? 0)
                if (candidate > best) acc[date] = log
            }
            return acc
        }, {})
    ).slice(0, 3)

    return (
        <div className="mt-3 border-t border-indigo-500/10 pt-3">
            <div className="flex items-center gap-2 rounded-lg bg-background/50 px-2.5 py-1.5">
                <span className="text-[10px] text-muted-foreground">Última vez:</span>
                <span className="text-[11px] font-medium text-foreground">
                    {isTime
                        ? latestLog.reps != null ? `${latestLog.reps} min` : '-'
                        : `${latestLog.weight != null ? formatWeight(latestLog.weight, weightUnit) : '-'} · ${latestLog.reps ?? '-'} reps`}
                </span>
                <span className="text-[10px] text-muted-foreground">· {latestLog.performed_at ?? '-'}</span>
                {isPR && <span className="ml-auto rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-bold text-emerald-500">🏆 PR</span>}
            </div>

            {dailyLogs.length > 1 && (
                <details className="mt-2 overflow-hidden rounded-lg border border-border bg-background">
                    <summary className="cursor-pointer list-none px-2.5 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                        Historial ({dailyLogs.length} días)
                    </summary>
                    <div className="border-t border-border bg-muted/20 p-2.5">
                        <div className="space-y-1">
                            {dailyLogs.map((log) => (
                                <div key={log.id} className="flex items-center justify-between rounded px-2 py-1 text-[11px]">
                                    <span className="text-muted-foreground">{(log.performed_at ?? '-').split('T')[0]}</span>
                                    <span className="font-medium text-foreground">
                                        {isTime ? log.reps != null ? `${log.reps} min` : '-' : `${log.weight != null ? formatWeight(log.weight, weightUnit) : '-'} · ${log.reps ?? '-'} reps`}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {!isTime && (
                            <div className="mt-2 h-24">
                                <ExerciseProgressChart logs={logs} />
                            </div>
                        )}
                    </div>
                </details>
            )}
        </div>
    )
}
