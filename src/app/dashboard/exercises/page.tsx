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
        if (!confirm('¿Estás seguro de que querés eliminar este ejercicio?')) return

        setError(null)
        const res = await deleteExercise(id)
        if (!res.ok) {
            setError(res.message)
            return
        }
        await load()
    }

    return (
        <div className="p-6">
            <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                Ejercicios
            </h1>

            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                Creá tu librería. Después la vamos a reutilizar para armar rutinas.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                    <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
                        Nuevo ejercicio
                    </h2>

                    <form onSubmit={onSubmit} className="space-y-3">
                        <input
                            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                            placeholder="Nombre (ej: Hip Thrust)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <textarea
                            className="min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                            placeholder="Descripción (opcional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <select
                                className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
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
                                className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
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
                            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
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
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className="h-10 w-full rounded-lg bg-zinc-900 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            {saving ? 'Guardando...' : 'Agregar ejercicio'}
                        </button>
                    </form>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                    <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
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
                        <div className="space-y-2">
                            {items.map((x) => (
                                <div
                                    key={x.id}
                                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                            {x.name}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {[x.category, x.level]
                                                    .filter(Boolean)
                                                    .join(' • ')}
                                                {x.metric_type
                                                    ? ` • ${x.metric_type === 'time'
                                                        ? 'Tiempo'
                                                        : 'Peso/Reps'
                                                    }`
                                                    : ''}
                                            </div>

                                            <button
                                                onClick={() => handleDelete(x.id)}
                                                className="text-xs text-red-600 transition-colors hover:text-red-500 dark:text-red-500 dark:hover:text-red-400"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>

                                    {x.description ? (
                                        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            {x.description}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}