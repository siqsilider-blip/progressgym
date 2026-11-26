'use client'

import { useEffect, useMemo, useState } from 'react'
import { CirclePlay, Dumbbell, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
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
const exerciseColumns = 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.75fr)_minmax(0,0.8fr)_minmax(0,0.72fr)_8.25rem]'
const inputCls = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring lg:rounded-lg'

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
        const q = search.trim().toLowerCase()
        return items.filter((x) => {
            const matchesSearch = !q
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

    return (
        <TrainerPageShell notebook className="space-y-4 lg:space-y-7">
            <DashboardPageHeader
                notebook
                title="Ejercicios"
                subtitle={loading ? 'Tu biblioteca de ejercicios' : `${items.length} en tu biblioteca · ${videosMissing} sin video`}
                action={(
                    <button
                        type="button"
                        onClick={() => { setShowForm(true); setError(null) }}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-10 lg:text-sm"
                    >
                        <Plus className="size-3.5 lg:size-4" aria-hidden="true" />
                        Nuevo ejercicio
                    </button>
                )}
            />

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6">
                <div className="relative min-w-0 lg:max-w-lg">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="search"
                        aria-label="Buscar por ejercicio o grupo muscular"
                        placeholder="Buscar ejercicio..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`${inputCls} pl-10 placeholder:text-muted-foreground`}
                    />
                </div>

                <div role="group" aria-label="Filtrar por video" className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 lg:gap-1.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
                    {([
                        { value: 'all', label: `Todos ${items.length}` },
                        { value: 'missing', label: `Sin video ${videosMissing}` },
                        { value: 'ready', label: `Con video ${videosReady}` },
                    ] as const).map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            aria-pressed={videoFilter === filter.value}
                            onClick={() => setVideoFilter(filter.value)}
                            className={`h-8 shrink-0 rounded-lg px-3 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:h-9 lg:rounded-md lg:text-xs ${videoFilter === filter.value
                                ? 'bg-primary text-primary-foreground lg:bg-accent lg:text-brand-soft'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {createdVariant && (
                <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l-2 lg:border-l-primary lg:bg-transparent">
                    Se creó «{createdVariant}». Ya podés elegirla al armar una rutina.
                </p>
            )}

            {error && !showForm && (
                <p role="alert" className="rounded-lg border border-destructive/25 px-4 py-3 text-sm text-destructive">{error}</p>
            )}
            {loading && (
                <p role="status" className="border-border text-sm text-muted-foreground lg:border-y lg:py-4">Cargando ejercicios…</p>
            )}
            {!loading && filtered.length === 0 && !error && (
                <p role="status" className="border-border text-sm text-muted-foreground lg:border-y lg:py-4">
                    {search.trim() || videoFilter !== 'all' ? 'No hay ejercicios que coincidan con la búsqueda o el filtro.' : 'Todavía no hay ejercicios en tu biblioteca.'}
                </p>
            )}
            {!loading && filtered.length > 0 && (
                <section aria-label="Biblioteca de ejercicios">
                    <div aria-hidden="true" className={`hidden items-center gap-3 border-y border-border py-2.5 text-xs font-semibold text-muted-foreground lg:grid ${exerciseColumns}`}>
                        <span>Ejercicio</span>
                        <span>Grupo muscular</span>
                        <span>Medida</span>
                        <span>Demostración</span>
                        <span className="text-right">Acciones</span>
                    </div>
                    <ul className="grid gap-2 lg:gap-0">
                        {filtered.map((exercise) => {
                            const shared = exercise.trainer_id === null
                            const action = shared ? 'Personalizar' : 'Editar'
                            const videoStatus = exercise.video_url ? 'Video listo' : 'Sin video'
                            const metricLabel = exerciseMetricLabel(exercise)
                            return (
                                <li key={exercise.id} className={`grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-card px-4 py-3 transition hover:bg-accent/50 lg:min-h-14 lg:rounded-none lg:border-0 lg:border-b lg:border-border lg:bg-transparent lg:px-0 lg:py-2.5 ${exerciseColumns}`}>
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary lg:size-8 lg:rounded-full lg:bg-muted lg:text-muted-foreground" aria-hidden="true">
                                            <span className="text-xs font-bold lg:hidden">{exercise.name.slice(0, 2).toUpperCase()}</span>
                                            <Dumbbell className="hidden size-4 lg:block" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{exercise.name}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{shared ? 'Compartido' : 'Propio'}<span className="lg:hidden"> · {metricLabel}</span></p>
                                            {exercise.muscle_group && <p className="mt-0.5 text-xs text-muted-foreground lg:hidden">{exercise.muscle_group}</p>}
                                        </div>
                                    </div>

                                    <p className="hidden text-sm text-foreground [overflow-wrap:anywhere] lg:block">
                                        <span className="sr-only">Grupo muscular: </span>{exercise.muscle_group || 'Sin grupo'}
                                    </p>
                                    <p className="hidden text-sm text-foreground lg:block">
                                        <span className="sr-only">Medida: </span>{metricLabel}
                                    </p>
                                    <p className={`flex items-center gap-1.5 pl-12 text-[11px] font-medium lg:pl-0 lg:text-xs lg:font-normal ${exercise.video_url ? 'text-emerald-800 lg:text-foreground dark:text-emerald-400 dark:lg:text-foreground' : 'text-amber-800 lg:text-muted-foreground dark:text-amber-400 dark:lg:text-muted-foreground'}`}>
                                        <CirclePlay className={`size-3 shrink-0 lg:size-3.5 lg:text-brand-soft ${exercise.video_url ? '' : 'lg:hidden'}`} aria-hidden="true" />
                                        {videoStatus}
                                    </p>

                                    <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-center justify-end gap-1.5 lg:col-auto lg:row-auto">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(exercise)}
                                            aria-label={`${action} ${exercise.name}`}
                                            title={`${action} ejercicio`}
                                            className="flex size-8 items-center justify-center gap-1.5 rounded-lg text-muted-foreground transition hover:bg-accent hover:text-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:h-9 lg:w-auto lg:rounded-md lg:px-2 lg:text-xs lg:font-semibold lg:text-brand-soft"
                                        >
                                            <Pencil className="size-4 shrink-0 lg:size-3.5" aria-hidden="true" />
                                            <span className="hidden lg:inline">{action}</span>
                                        </button>
                                        {!shared && (
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(exercise.id)}
                                                aria-label={`Eliminar ${exercise.name}`}
                                                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                            >
                                                <Trash2 className="size-4" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </section>
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
                        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-border bg-background p-5 shadow-2xl md:max-w-2xl md:rounded-2xl md:border md:p-6 lg:max-w-xl lg:rounded-xl lg:p-7"
                        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between gap-3 lg:border-b lg:border-border lg:pb-4">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-brand-soft">
                                    {editingExercise.trainer_id === null ? 'Ejercicio del catálogo' : 'Ejercicio propio'}
                                </p>
                                <h2 id="edit-exercise-title" className="text-base font-bold text-foreground [overflow-wrap:anywhere] lg:mt-1 lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-3xl lg:font-normal lg:tracking-tight">
                                    {editingExercise.name}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingExercise(null)}
                                aria-label="Cerrar ficha del ejercicio"
                                disabled={variantSaving || editSaving}
                                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <details className="mb-4 rounded-xl border border-border bg-card px-3 py-2.5 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-3 lg:pt-0">
                            <summary className="cursor-pointer text-sm font-semibold text-foreground">Crear versión con otra medida</summary>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                Medida actual: {exerciseMetricLabel(editingExercise)}. La versión usa el video y las indicaciones guardados.
                            </p>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <label htmlFor="variant-metric" className="text-xs font-medium text-muted-foreground">Nueva medida</label>
                                    <select
                                        id="variant-metric"
                                        className={inputCls}
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
                                    <label htmlFor="edit-exercise-name" className="text-xs font-medium text-muted-foreground">Nombre del ejercicio</label>
                                    <input
                                        id="edit-exercise-name"
                                        className={inputCls}
                                        placeholder="Nombre"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label htmlFor="edit-exercise-description" className="text-xs font-medium text-muted-foreground">Indicaciones simples (opcional)</label>
                                <textarea
                                    id="edit-exercise-description"
                                    className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring lg:rounded-lg"
                                    placeholder="Ej.: apoyá toda la espalda y empujá sin despegar los talones."
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                />
                            </div>

                            {editingExercise.trainer_id !== null ? (
                                <div className="space-y-1">
                                    <label htmlFor="edit-exercise-group" className="text-xs font-medium text-muted-foreground">Grupo muscular</label>
                                    <select
                                        id="edit-exercise-group"
                                        className={inputCls}
                                        value={editMuscleGroup}
                                        onChange={(e) => setEditMuscleGroup(e.target.value)}
                                    >
                                        <option value="">Sin categoría</option>
                                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-5 text-muted-foreground lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l-2 lg:bg-transparent">
                                    Esta personalización será sólo tuya. El ejercicio original seguirá intacto para los demás entrenadores.
                                </p>
                            )}

                            <div className="space-y-1">
                                <label htmlFor="edit-exercise-video" className="text-xs font-medium text-muted-foreground">Video demostrativo (opcional)</label>
                                <input
                                    id="edit-exercise-video"
                                    type="url"
                                    placeholder="Pegá un enlace de YouTube"
                                    value={editVideoUrl}
                                    onChange={(e) => setEditVideoUrl(e.target.value)}
                                    className={`${inputCls} placeholder:text-muted-foreground`}
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Recomendado: video corto de YouTube como “no listado”. El alumno lo verá sin salir de la rutina.
                                </p>
                            </div>

                            {editError && <p role="alert" className="text-sm text-destructive">{editError}</p>}

                            <button
                                type="submit"
                                disabled={editSaving || variantSaving}
                                className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 lg:w-auto lg:rounded-lg"
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
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="new-exercise-title"
                        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-border bg-background p-5 shadow-2xl md:max-w-2xl md:rounded-2xl md:border md:p-6 lg:max-w-xl lg:rounded-xl lg:p-7"
                        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between gap-3 lg:border-b lg:border-border lg:pb-4">
                            <h2 id="new-exercise-title" className="text-base font-bold text-foreground lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-3xl lg:font-normal lg:tracking-tight">Nuevo ejercicio</h2>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                aria-label="Cerrar creación de ejercicio"
                                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-3">
                            <input
                                aria-label="Nombre del ejercicio"
                                className={inputCls}
                                placeholder="Nombre (ej: Hip Thrust)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />

                            <textarea
                                aria-label="Indicaciones simples (opcional)"
                                className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring lg:rounded-lg"
                                placeholder="Indicaciones simples (opcional). Ej.: mantené la espalda apoyada."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <select className={inputCls} aria-label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="">Categoría</option>
                                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>

                                <select className={inputCls} aria-label="Nivel" value={level} onChange={(e) => setLevel(e.target.value)}>
                                    <option value="">Nivel</option>
                                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="new-exercise-metric" className="text-xs font-medium text-muted-foreground">Cómo se registra</label>
                                <select id="new-exercise-metric" className={inputCls} value={metric} onChange={(e) => setMetric(e.target.value as ExerciseMetric)}>
                                    {EXERCISE_METRIC_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="new-exercise-video" className="text-xs font-medium text-muted-foreground">
                                    Video demostrativo (opcional)
                                </label>
                                <input
                                    id="new-exercise-video"
                                    type="url"
                                    placeholder="Pegá un enlace de YouTube"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className={`${inputCls} placeholder:text-muted-foreground`}
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Recomendado: video corto de YouTube como “no listado”. El alumno lo verá sin salir de la rutina.
                                </p>
                            </div>

                            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

                            <button
                                type="submit"
                                disabled={saving}
                                className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 lg:w-auto lg:rounded-lg"
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
