'use client'

import { useEffect, useState } from 'react'
import { createExercise, listExercises, deleteExercise } from './actions'

type Exercise = {
    id: string
    name: string
    description: string | null
    category: string | null
    level: string | null
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

export default function ExercisesPage() {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [level, setLevel] = useState('')

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
            })

            if (!res.ok) {
                setError(res.message)
                return
            }

            setName('')
            setDescription('')
            setCategory('')
            setLevel('')
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
            <h1 className="text-2xl font-semibold mb-1">Ejercicios</h1>
            <p className="text-sm text-zinc-400 mb-6">Creá tu librería. Después la vamos a reutilizar para armar rutinas.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                    <h2 className="text-lg font-medium mb-4">Nuevo ejercicio</h2>

                    <form onSubmit={onSubmit} className="space-y-3">
                        <input
                            className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm"
                            placeholder="Nombre (ej: Hip Thrust)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <textarea
                            className="w-full min-h-24 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                            placeholder="Descripción (opcional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <select
                                className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm"
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
                                className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm"
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

                        {error && (
                            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className="h-10 w-full rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Agregar ejercicio'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                    <h2 className="text-lg font-medium mb-4">Tu librería</h2>

                    {loading ? (
                        <p className="text-sm text-zinc-400">Cargando...</p>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-zinc-400">No hay ejercicios todavía.</p>
                    ) : (
                        <div className="space-y-2">
                            {items.map((x) => (
                                <div key={x.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium">{x.name}</div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs text-zinc-400">
                                                {[x.category, x.level].filter(Boolean).join(' • ')}
                                            </div>
                                            <button
                                                onClick={() => handleDelete(x.id)}
                                                className="text-xs text-red-500 hover:text-red-400 transition-colors"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                    {x.description ? <div className="text-sm text-zinc-400 mt-1">{x.description}</div> : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}