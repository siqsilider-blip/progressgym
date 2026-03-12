'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createWorkout, deleteWorkout } from './actions'

type Student = { id: string; full_name: string | null }
type Workout = {
    id: string
    student_id: string
    date: string
    name: string | null
    notes: string | null
}

export default function WorkoutsPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [workouts, setWorkouts] = useState<Workout[]>([])

    const [studentId, setStudentId] = useState('')
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [name, setName] = useState('')
    const [notes, setNotes] = useState('')

    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    async function load() {
        setError(null)

        const { data: st, error: stErr } = await supabase
            .from('students')
            .select('id, full_name')
            .order('created_at', { ascending: false })

        if (stErr) {
            setError(stErr.message)
            return
        }
        setStudents(st ?? [])

        const { data: wo, error: woErr } = await supabase
            .from('workouts')
            .select('id, student_id, date, name, notes')
            .order('date', { ascending: false })

        if (woErr) {
            setError(woErr.message)
            return
        }
        setWorkouts(wo ?? [])
    }

    useEffect(() => {
        load()
    }, [])

    const studentMap = useMemo(() => {
        const m = new Map<string, string>()
        students.forEach(s => m.set(s.id, s.full_name ?? 'Sin nombre'))
        return m
    }, [students])

    async function onCreate() {
        setError(null)
        if (!studentId) {
            setError('Elegí un alumno.')
            return
        }

        setSaving(true)
        try {
            const res = await createWorkout({
                student_id: studentId,
                date,
                name: name.trim() || null,
                notes: notes.trim() || null,
            })
            if (!res.ok) {
                setError(res.message ?? 'Error creando rutina.')
                return
            }
            setName('')
            setNotes('')
            await load()
        } finally {
            setSaving(false)
        }
    }

    async function onDelete(id: string) {
        if (!confirm('¿Eliminar esta rutina?')) return
        setError(null)
        const res = await deleteWorkout(id)
        if (!res.ok) {
            setError(res.message ?? 'Error eliminando rutina.')
            return
        }
        await load()
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Rutinas</h1>
                <p className="text-sm text-zinc-400">Creá sesiones por alumno y después les agregamos ejercicios.</p>
            </div>

            {error && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                    {error}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                    <h2 className="font-semibold mb-4">Nueva rutina</h2>

                    <div className="space-y-3">
                        <select
                            className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                        >
                            <option value="">Elegí alumno...</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.full_name ?? 'Sin nombre'}
                                </option>
                            ))}
                        </select>

                        <input
                            className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />

                        <input
                            className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm"
                            placeholder="Nombre (opcional) ej: Piernas A"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <textarea
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                            placeholder="Notas (opcional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                        />

                        <button
                            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
                            disabled={saving}
                            onClick={onCreate}
                        >
                            {saving ? 'Guardando...' : 'Crear rutina'}
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                    <h2 className="font-semibold mb-4">Rutinas creadas</h2>

                    {workouts.length === 0 ? (
                        <p className="text-sm text-zinc-400">Todavía no hay rutinas.</p>
                    ) : (
                        <div className="space-y-3">
                            {workouts.map(w => (
                                <div key={w.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">
                                            {studentMap.get(w.student_id) ?? 'Alumno'}
                                        </div>
                                        <div className="text-xs text-zinc-400">
                                            {w.date} {w.name ? `• ${w.name}` : ''}
                                        </div>
                                        {w.notes && <div className="text-sm text-zinc-300 mt-2">{w.notes}</div>}
                                    </div>

                                    <button
                                        className="text-sm text-red-400 hover:text-red-300"
                                        onClick={() => onDelete(w.id)}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}