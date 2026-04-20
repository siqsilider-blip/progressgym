'use client'

import { useEffect, useMemo, useState } from 'react'
import { createExercise, listExercises, deleteExercise } from './actions'

type Exercise = {
    id: string
    name: string
    description: string | null
    category: string | null
    level: string | null
    metric_type: 'reps' | 'time' | null
}

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

    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [items, setItems] = useState<Exercise[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [search, setSearch] = useState('')

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
            const res = await createExercise({ name, description, category, level, metric_type: metricType })
            if (!res.ok) {
                setError(res.message)
                return
            }
            setName('')
            setDescription('')
            setCategory('')
            setLevel('')
            setMetricType('reps')
            setShowForm(false)
            await load()
        } finally {
            setSaving(false)
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
        if (!search.trim()) return items
        const q = search.toLowerCase()
        return items.filter((x) =>
            x.name.toLowerCase().includes(q) ||
            (x.category ?? '').toLowerCase().includes(q)
        )
    }, [items, search])

    const inputCls = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
    const selectCls = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none'

    return (
        <div className="mx-auto max-w-xl space-y-4 p-4 pb-24 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Ejercicios
                </h1>
                <button
                    type="button"
                    onClick={() => { setShowForm(true); setError(null) }}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                    + Nuevo
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
                <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Buscar ejercicio..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="shrink-0 text-muted-foreground transition hover:text-foreground"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* List */}
            <div className="rounded-2xl border border-border bg-card shadow-sm">
                {loading ? (
                    <p className="p-4 text-sm text-muted-foreground">Cargando...</p>
                ) : filtered.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                        {search ? 'Sin resultados.' : 'No hay ejercicios todavía.'}
                    </p>
                ) : (
                    <div className="divide-y divide-border">
                        {filtered.map((x) => {
                            const meta = [x.category, x.level, x.metric_type === 'time' ? 'Cardio' : x.metric_type === 'reps' ? 'Fuerza' : null]
                                .filter(Boolean).join(' · ')

                            return (
                                <div key={x.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-card-foreground">
                                            {x.name}
                                        </p>
                                        {meta && (
                                            <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleDelete(x.id)}
                                        aria-label={`Eliminar ${x.name}`}
                                        className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

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
                                placeholder="Descripción (opcional)"
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
