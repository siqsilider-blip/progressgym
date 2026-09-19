'use client'

import { useEffect, useMemo, useState } from 'react'
import { CirclePlay, Pencil } from 'lucide-react'
import { createExercise, listExercises, deleteExercise, updateExercise } from './actions'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

type Exercise = {
    id: string
    name: string
    description: string | null
    muscle_group: string | null
    video_url: string | null
    trainer_id: string | null
    is_personalized?: boolean
}

type VideoFilter = 'all' | 'missing' | 'ready'

const CATEGORIES = [
    'Pecho', 'Espalda', 'Piernas', 'Glúteos', 'Hombros',
    'Bíceps', 'Tríceps', 'Core', 'Cardio',
]

const LEVELS = ['Principiante', 'Intermedio', 'Avanzado']

const METRIC_TYPES = [
    { value: 'reps', label: 'Fuerza (reps + peso)' },
    { value: 'time', label: 'Cardio (tiempo)' },
] as const

export default function ExercisesPage() {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [level, setLevel] = useState('')
    const [metricType, setMetricType] = useState<'reps' | 'time'>('reps')
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
        if (category === 'Cardio') setMetricType('time')
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
            const res = await createExercise({ name, description, category, level, metric_type: metricType, video_url: videoUrl })
            if (!res.ok) {
                setError(res.message)
                return
            }
            setName('')
            setDescription('')
            setCategory('')
            setLevel('')
            setMetricType('reps')
            setVideoUrl('')
            setShowForm(false)
            await load()
        } finally {
            setSaving(false)
        }
    }

    function openEdit(x: Exercise) {
        setEditingExercise(x)
        setEditName(x.name)
        setEditDescription(x.description ?? '')
        setEditMuscleGroup(x.muscle_group ?? '')
        setEditVideoUrl(x.video_url ?? '')
        setEditError(null)
    }

    async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!editingExercise) return
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

    const inputCls = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
    const selectCls = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none'

    return (
        <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24 md:p-6">
            {/* Header */}
            <DashboardPageHeader
                title="Ejercicios"
                subtitle={`${items.length} en tu biblioteca · ${videosMissing} sin video`}
                action={
                    <button
                        type="button"
                        onClick={() => { setShowForm(true); setError(null) }}
                        className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
                    >
                        + Nuevo
                    </button>
                }
            />

            {/* Search */}
            <input
                type="text"
                placeholder="Buscar ejercicio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500 transition"
            />

            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por demostración">
                {([
                    { value: 'all', label: `Todos ${items.length}` },
                    { value: 'missing', label: `Sin video ${videosMissing}` },
                    { value: 'ready', label: `Con video ${videosReady}` },
                ] as const).map((filter) => (
                    <button
                        key={filter.value}
                        type="button"
                        onClick={() => setVideoFilter(filter.value)}
                        className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-semibold transition ${videoFilter === filter.value
                            ? 'bg-indigo-600 text-white'
                            : 'border border-border bg-secondary text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {search ? 'Sin resultados.' : 'No hay ejercicios todavía.'}
                </p>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((x) => {
                        const initials = x.name.slice(0, 2).toUpperCase()
                        return (
                            <div key={x.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 transition hover:bg-white/[0.04]">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xs font-bold text-indigo-400">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-zinc-100">{x.name}</p>
                                        <div className="mt-0.5 flex items-center gap-2">
                                            <p className="truncate text-xs text-zinc-500">{x.muscle_group ?? 'Sin categoría'}</p>
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${x.video_url ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                <CirclePlay className="h-3 w-3" aria-hidden="true" />
                                                {x.video_url ? 'Video listo' : 'Sin video'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEdit(x)}
                                        aria-label={`${x.trainer_id === null ? 'Agregar demostración a' : 'Editar'} ${x.name}`}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-indigo-500/10 hover:text-indigo-400"
                                    >
                                        {x.trainer_id === null
                                            ? <CirclePlay className="h-5 w-5" aria-hidden="true" />
                                            : <Pencil className="h-4 w-4" aria-hidden="true" />}
                                    </button>
                                    {x.trainer_id !== null && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(x.id)}
                                            aria-label={`Eliminar ${x.name}`}
                                            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
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
                    onClick={() => setEditingExercise(null)}
                >
                    <div
                        className="w-full max-w-lg rounded-t-3xl border-t border-border bg-background p-5 shadow-2xl md:rounded-2xl md:border"
                        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-indigo-400">
                                    {editingExercise.trainer_id === null ? 'Ejercicio del catálogo' : 'Ejercicio propio'}
                                </p>
                                <h2 className="text-base font-bold text-card-foreground">
                                    {editingExercise.trainer_id === null ? editingExercise.name : 'Editar ejercicio'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingExercise(null)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

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
                                    className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500 transition"
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Recomendado: video corto de YouTube como “no listado”. El alumno lo verá sin salir de la rutina.
                                </p>
                            </div>

                            {editError && <p className="text-sm text-red-500">{editError}</p>}

                            <button
                                type="submit"
                                disabled={editSaving}
                                className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
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
                        className="w-full max-w-lg rounded-t-3xl border-t border-border bg-background p-5 shadow-2xl md:rounded-2xl md:border"
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
                                className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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

                            <select className={selectCls} value={metricType} onChange={(e) => setMetricType(e.target.value as 'reps' | 'time')}>
                                {METRIC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Video demostrativo (opcional)
                                </label>
                                <input
                                    type="url"
                                    placeholder="Pegá un enlace de YouTube"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500 transition"
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Recomendado: video corto de YouTube como “no listado”. El alumno lo verá sin salir de la rutina.
                                </p>
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <button
                                type="submit"
                                disabled={saving}
                                className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Agregar ejercicio'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
