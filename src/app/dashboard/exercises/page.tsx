'use client'

import { useEffect, useState } from 'react'
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
    'Pecho',
    'Espalda',
    'Piernas',
    'Glúteos',
    'Hombros',
    'Bíceps',
    'Tríceps',
    'Core',
    'Cardio',
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

    const [selectedId, setSelectedId] = useState<string | null>(null)

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

    useEffect(() => {
        void load()
    }, [])

    useEffect(() => {
        if (category === 'Cardio') {
            setMetricType('time')
        }
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
            const res = await createExercise({
                name,
                description,
                category,
                level,
                metric_type: metricType,
            })

            if (!res.ok) {
                setError(res.message)
                return
            }

            setName('')
            setDescription('')
            setCategory('')
            setLevel('')
            setMetricType('reps')
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

        if (selectedId === id) {
            setSelectedId(null)
        }

        await load()
    }

    return (
        <div className="min-h-screen bg-zinc-100 p-6 dark:bg-transparent">
            <h1 className="mb-1 text-3xl font-bold text-zinc-900 dark:text-white">
                Ejercicios
            </h1>

            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                Creá tu librería y reutilizala en las rutinas.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                    <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                        Nuevo ejercicio
                    </h2>

                    <form onSubmit={onSubmit} className="space-y-3">
                        <input
                            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            placeholder="Nombre (ej: Hip Thrust)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <textarea
                            className="min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            placeholder="Descripción (opcional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <select
                                className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="">Categoría</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                            >
                                <option value="">Nivel</option>
                                {LEVELS.map((l) => (
                                    <option key={l} value={l}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <select
                            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            value={metricType}
                            onChange={(e) =>
                                setMetricType(e.target.value as 'reps' | 'time')
                            }
                        >
                            {METRIC_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>

                        {error && (
                            <div className="text-sm text-red-600 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Agregar ejercicio'}
                        </button>
                    </form>
                </div>

                <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                    <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                        Tu librería
                    </h2>

                    {loading ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Cargando...
                        </p>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            No hay ejercicios todavía.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {items.map((x) => {
                                const selected = selectedId === x.id

                                return (
                                    <div
                                        key={x.id}
                                        onClick={() => setSelectedId(x.id)}
                                        className={[
                                            'cursor-pointer rounded-xl border p-4 transition duration-200 hover:shadow-md',
                                            selected
                                                ? 'border-blue-500 bg-blue-50 shadow-sm dark:border-blue-500 dark:bg-blue-500/10'
                                                : 'border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900',
                                        ].join(' ')}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {x.name}
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDelete(x.id)
                                                }}
                                                className="rounded-md px-2 py-1 text-sm text-red-600 transition hover:bg-red-50 hover:text-red-500 dark:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                                aria-label={`Eliminar ${x.name}`}
                                            >
                                                🗑
                                            </button>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                            {x.category && (
                                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                                                    {x.category}
                                                </span>
                                            )}

                                            {x.level && (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                                    {x.level}
                                                </span>
                                            )}

                                            {x.metric_type && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                    {x.metric_type === 'time'
                                                        ? 'Tiempo'
                                                        : 'Peso/Reps'}
                                                </span>
                                            )}
                                        </div>

                                        {x.description && (
                                            <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-400">
                                                {x.description}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}