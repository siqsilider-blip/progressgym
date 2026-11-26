'use client'

import { useEffect, useMemo, useState } from 'react'
import { CirclePlay, Pencil } from 'lucide-react'
import { createExercise, createExerciseVariant, listExercises, deleteExercise, updateExercise } from './actions'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'
import { EXERCISE_METRIC_OPTIONS, getExerciseMetric, type ExerciseMetric, type ExerciseMetricFields } from '@/lib/exerciseMetric'

type Exercise = {
    id: string
    name: string
    description: string | null
    muscle_group: string | null
    video_url: string | null
    trainer_id: string | null
    is_personalized?: boolean
} & ExerciseMetricFields

type VideoFilter = 'all' | 'missing' | 'ready'

const CATEGORIES = [
    'Pecho', 'Espalda', 'Piernas', 'Glúteos', 'Hombros',
    'Bíceps', 'Tríceps', 'Core', 'Cardio',
]

const LEVELS = ['Principiante', 'Intermedio', 'Avanzado']

function exerciseMetricLabel(exercise: Exercise) {
    return EXERCISE_METRIC_OPTIONS.find((option) => option.value === getExerciseMetric(exercise))?.label
}

export default function ExercisesPage() {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [level, setLevel] = useState('')
    const [metric, setMetric] = useState<ExerciseMetric>('reps')
    const [videoUrl, setVideoUrl] = useState('')

    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [items, setItems] = useState<Exercise[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [search, setSearch] = useState('')
    const [videoFilter, setVideoFilter] = useState<VideoFilter>('all')

    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editMuscleGroup, setEditMuscleGroup] = useState('')
    const [editVideoUrl, setEditVideoUrl] = useState('')
    const [editSaving, setEditSaving] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)
    const [variantMetric, setVariantMetric] = useState<ExerciseMetric | ''>('')
    const [variantSaving, setVariantSaving] = useState(false)
    const [variantError, setVariantError] = useState<string | null>(null)
    const [createdVariant, setCreatedVariant] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        const res = await listExercises()
        if (!res.ok) {
            setError(res.message)
            setItems([])
        } else {
            setError(null)
            setItems(res.items)
        }
        setLoading(false)
    }

    useEffect(() => { void load() }, [])

    useEffect(() => {
        if (category === 'Cardio') setMetric('minutes')
    }, [category])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!name.trim()) {
            setError('Poné un nombre de ejercicio.')
            return
        }

        setSaving(true)
        try {
            const res = await createExercise({ name, description, category, level, metric, video_url: videoUrl })
            if (!res.ok) {
                setError(res.message)
                return
            }
            setName('')
            setDescription('')
            setCategory('')
            setLevel('')
            setMetric('reps')
            setVideoUrl('')
            setShowForm(false)
            await load()
        } finally {
            setSaving(false)
        }
    }

    function openEdit(x: Exercise) {
        setCreatedVariant(null)
        setEditingExercise(x)
        setEditName(x.name)
        setEditDescription(x.description ?? '')
        setEditMuscleGroup(x.muscle_group ?? '')
        setEditVideoUrl(x.video_url ?? '')
        setEditError(null)
        setVariantMetric('')
        setVariantError(null)
    }

    async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!editingExercise || variantSaving) return
        if (editingExercise.trainer_id !== null && !editName.trim()) {
            setEditError('El nombre no puede estar vacío.')
            return
        }
        setEditSaving(true)
        try {
            const res = await updateExercise(editingExercise.id, {
                name: editName,
                description: editDescription,
                muscle_group: editMuscleGroup,
                video_url: editVideoUrl,
            })
            if (!res.ok) {
                setEditError(res.message || 'No se pudo guardar.')
                return
            }
            setEditingExercise(null)
            await load()
        } finally {
            setEditSaving(false)
        }
    }

    async function handleCreateVariant() {
        if (!editingExercise || !variantMetric || variantSaving || editSaving) return
        setVariantError(null)
        setVariantSaving(true)
        try {
            const result = await createExerciseVariant(editingExercise.id, variantMetric)
            if (!result.ok) {
                setVariantError(result.message)
                return
            }
            setEditingExercise(null)
            setSearch(result.name)
            setVideoFilter('all')
            setCreatedVariant(result.name)
            await load()
        } catch {
            setVariantError('No pudimos crear la versión. Volvé a intentar.')
        } finally {
            setVariantSaving(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este ejercicio?')) return
        const res = await deleteExercise(id)
        if (!res.ok) {
            setError(res.message)
            return
        }
        await load()
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return items.filter((x) => {
            const matchesSearch = !q.trim()
                || x.name.toLowerCase().includes(q)
                || (x.muscle_group ?? '').toLowerCase().includes(q)
            const matchesVideo = videoFilter === 'all'
                || (videoFilter === 'ready' && Boolean(x.video_url))
                || (videoFilter === 'missing' && !x.video_url)

            return matchesSearch && matchesVideo
        })
    }, [items, search, videoFilter])

    const videosReady = useMemo(() => items.filter((item) => Boolean(item.video_url)).length, [items])
    const videosMissing = items.length - videosReady

    const inputCls = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary'
    const selectCls = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none'

    return (
        <TrainerPageShell className="space-y-4">
            {/* Header */}
            <DashboardPageHeader
                title="Ejercicios"
                subtitle={`${items.length} en tu biblioteca · ${videosMissing} sin video`}
                action={
                    <button
                        type="button"
                        onClick={() => { setShowForm(true); setError(null) }}
                        className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary"
                    >
                        + Nuevo
                    </button>
                }
            />

            {/* Search */}
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <input
                    type="text"
                    placeholder="Buscar por ejercicio o grupo muscular..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary"
                />

                <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1" aria-label="Filtrar por demostración">
                    {([
                        { value: 'all', label: `Todos ${items.length}` },
                        { value: 'missing', label: `Sin video ${videosMissing}` },
                        { value: 'ready', label: `Con video ${videosReady}` },
                    ] as const).map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            onClick={() => setVideoFilter(filter.value)}
                            className={`h-8 shrink-0 rounded-lg px-3 text-[11px] font-semibold transition ${videoFilter === filter.value
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {createdVariant && (
                <p role="status" className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
                    Se creó «{createdVariant}». Ya podés elegirla al armar una rutina.
                </p>
            )}

            {/* List */}
            {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {search ? 'Sin resultados.' : 'No hay ejercicios todavía.'}
                </p>
            ) : (
                <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                    {filtered.map((x) => {
                        const initials = x.name.slice(0, 2).toUpperCase()
                        return (
                            <div key={x.id} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-primary/20 hover:bg-accent/70">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xs font-bold text-primary">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-card-foreground">{x.name}</p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                            <p className="text-xs text-muted-foreground">{x.trainer_id === null ? 'Compartido' : 'Propio'} · {exerciseMetricLabel(x)}</p>
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${x.video_url ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                                                <CirclePlay className="h-3 w-3" aria-hidden="true" />
                                                {x.video_url ? 'Video listo' : 'Sin video'}
                                            </span>
                                        </div>
                                        {x.muscle_group && <p className="mt-0.5 truncate text-xs text-muted-foreground">{x.muscle_group}</p>}
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEdit(x)}
                                        aria-label={`${x.trainer_id === null ? 'Personalizar' : 'Editar'} ${x.name}`}
                                        title={x.trainer_id === null ? 'Personalizar ejercicio' : 'Editar ejercicio'}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                                    >
                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                    {x.trainer_id !== null && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(x.id)}
                                            aria-label={`Eliminar ${x.name}`}
                                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Edit modal */}
            {editingExercise && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
                    onClick={() => { if (!variantSaving && !editSaving) setEditingExercise(null) }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-exercise-title"
                        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-border bg-background p-5 shadow-2xl md:max-w-2xl md:rounded-2xl md:border md:p-6"
                        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-primary">
                                    {editingExercise.trainer_id === null ? 'Ejercicio del catálogo' : 'Ejercicio propio'}
                                </p>
                                <h2 id="edit-exercise-title" className="text-base font-bold text-card-foreground">
                                    {editingExercise.name}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingExercise(null)}
                                aria-label="Cerrar ficha del ejercicio"
                                disabled={variantSaving || editSaving}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <details className="mb-4 rounded-xl border border-border bg-card px-3 py-2.5">
                            <summary className="cursor-pointer text-sm font-semibold text-foreground">Crear versión con otra medida</summary>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                Medida actual: {exerciseMetricLabel(editingExercise)}. La versión usa el video y las indicaciones guardados.
                            </p>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <label htmlFor="variant-metric" className="text-xs font-medium text-muted-foreground">Nueva medida</label>
                                    <select
                                        id="variant-metric"
                                        className={selectCls}
                                        value={variantMetric}
                                        disabled={variantSaving || editSaving}
                                        onChange={(event) => { setVariantMetric(event.target.value as ExerciseMetric | ''); setVariantError(null) }}
                                    >
                                        <option value="">Elegí una medida</option>
                                        {EXERCISE_METRIC_OPTIONS.filter((option) => option.value !== getExerciseMetric(editingExercise)).map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCreateVariant}
                                    disabled={!variantMetric || variantSaving || editSaving}
                                    className="h-10 shrink-0 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition disabled:opacity-50"
                                >
                                    {variantSaving ? 'Creando…' : 'Crear versión propia'}
                                </button>
                            </div>
                            {variantError && <p role="alert" className="mt-2 text-xs text-red-500">{variantError}</p>}
                        </details>

                        <form onSubmit={handleEditSubmit} className="space-y-3">
                            {editingExercise.trainer_id !== null && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Nombre del ejercicio</label>
                                    <input
                                        className={inputCls}
                                        placeholder="Nombre"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Indicaciones simples (opcional)</label>
                                <textarea
                                    className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                    placeholder="Ej.: apoyá toda la espalda y empujá sin despegar los talones."
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                />
                            </div>

                            {editingExercise.trainer_id !== null ? (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Grupo muscular</label>
                                    <select
                                        className={selectCls}
                                        value={editMuscleGroup}
                                        onChange={(e) => setEditMuscleGroup(e.target.value)}
                                    >
                                        <option value="">Sin categoría</option>
                                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                                    Esta personalización será sólo tuya. El ejercicio original seguirá intacto para los demás entrenadores.
                                </p>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Video demostrativo (opcional)</label>
                                <input
                                    type="url"
                                    placeholder="Pegá un enlace de YouTube"
                                    value={editVideoUrl}
                                    onChange={(e) => setEditVideoUrl(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition"
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Recomendado: video corto de YouTube como “no listado”. El alumno lo verá sin salir de la rutina.
                                </p>
                            </div>

                            {editError && <p className="text-sm text-red-500">{editError}</p>}

                            <button
                                type="submit"
                                disabled={editSaving || variantSaving}
                                className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:opacity-50"
                            >
                                {editSaving
                                    ? 'Guardando...'
                                    : editingExercise.trainer_id === null
                                        ? 'Guardar demostración'
                                        : 'Guardar cambios'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showForm && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
                    onClick={() => setShowForm(false)}
                >
                    <div
                        className="w-full max-w-lg rounded-t-3xl border-t border-border bg-background p-5 shadow-2xl md:max-w-2xl md:rounded-2xl md:border md:p-6"
                        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-bold text-card-foreground">Nuevo ejercicio</h2>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-3">
                            <input
                                className={inputCls}
                                placeholder="Nombre (ej: Hip Thrust)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />

                            <textarea
                                className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="Indicaciones simples (opcional). Ej.: mantené la espalda apoyada."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="">Categoría</option>
                                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>

                                <select className={selectCls} value={level} onChange={(e) => setLevel(e.target.value)}>
                                    <option value="">Nivel</option>
                                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="new-exercise-metric" className="text-xs font-medium text-muted-foreground">Cómo se registra</label>
                                <select id="new-exercise-metric" className={selectCls} value={metric} onChange={(e) => setMetric(e.target.value as ExerciseMetric)}>
                                    {EXERCISE_METRIC_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Video demostrativo (opcional)
                                </label>
                                <input
                                    type="url"
                                    placeholder="Pegá un enlace de YouTube"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition"
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Recomendado: video corto de YouTube como “no listado”. El alumno lo verá sin salir de la rutina.
                                </p>
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <button
                                type="submit"
                                disabled={saving}
                                className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Agregar ejercicio'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </TrainerPageShell>
    )
}
