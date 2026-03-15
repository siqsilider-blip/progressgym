'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
}

type Routine = {
    id: string
    student_id: string
}

type Props = {
    students: Student[]
    routines: Routine[]
    error: string | null
}

export default function RoutinesClient({
    students,
    routines,
    error,
}: Props) {
    const [studentId, setStudentId] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const routineByStudentId = useMemo(() => {
        const map = new Map<string, string>()

        for (const routine of routines) {
            map.set(routine.student_id, routine.id)
        }

        return map
    }, [routines])

    const selectedRoutineId = studentId
        ? routineByStudentId.get(studentId) ?? null
        : null

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
                        autoComplete="off"
                        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
                    >
                        <option value="">Seleccionar...</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.first_name ?? ''} {student.last_name ?? ''}
                            </option>
                        ))}
                    </select>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {mounted && studentId && !error && (
                    <div className="mt-5">
                        {selectedRoutineId ? (
                            <Link
                                href={`/dashboard/routines/${selectedRoutineId}`}
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