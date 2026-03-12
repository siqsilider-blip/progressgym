'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getRoutineForStudent } from './actions'
import Link from 'next/link'

type Student = {
    id: string
    first_name: string
    last_name: string
}

export default function RoutinesPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [studentId, setStudentId] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [routineId, setRoutineId] = useState<string | null>(null)

    useEffect(() => {
        ; (async () => {
            setLoading(true)
            setError(null)

            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                setError(error.message)
                setStudents([])
            } else {
                const mappedStudents: Student[] = ((data as any[]) || []).map((student) => ({
                    id: student.id,
                    first_name: student.first_name ?? '',
                    last_name: student.last_name ?? '',
                }))

                setStudents(mappedStudents)
            }

            setLoading(false)
        })()
    }, [])

    async function loadRoutineForSelected() {
        setRoutineId(null)
        setError(null)

        if (!studentId) return

        const res = await getRoutineForStudent(studentId)

        if (!res.ok) {
            setError(res.message ?? 'Error')
            return
        }

        setRoutineId(res.routine?.id ?? null)
    }

    useEffect(() => {
        loadRoutineForSelected()
    }, [studentId])

    return (
        <div className="p-8 text-white">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Rutinas</h1>
                <p className="mt-2 text-sm text-zinc-400">
                    Elegí un alumno y creá su rutina de 4 días (una sola por alumno).
                </p>
            </div>

            <div className="max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                <div className="space-y-2">
                    <label
                        htmlFor="student"
                        className="text-sm font-medium text-zinc-300"
                    >
                        Alumno
                    </label>

                    <select
                        id="student"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
                    >
                        <option value="">Seleccionar...</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.first_name} {student.last_name}
                            </option>
                        ))}
                    </select>
                </div>

                {loading && (
                    <p className="mt-4 text-sm text-zinc-400">Cargando alumnos...</p>
                )}

                {error && (
                    <div className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {studentId && !loading && !error && (
                    <div className="mt-5">
                        {routineId ? (
                            <Link
                                href={`/dashboard/routines/${routineId}`}
                                className="inline-flex rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                            >
                                Ver rutina actual
                            </Link>
                        ) : (
                            <Link
                                href={`/dashboard/routines/new?studentId=${studentId}`}
                                className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                            >
                                Crear rutina 4 días
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}