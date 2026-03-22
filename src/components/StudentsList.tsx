'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    active_plan: string | null
    created_at: string | null
}

type RoutineMap = Record<string, string>

type Props = {
    students: Student[]
    routinesByStudentId: RoutineMap
}

export default function StudentsList({
    students,
    routinesByStudentId,
}: Props) {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'with' | 'without'>('all')

    const filteredStudents = useMemo(() => {
        const searchLower = search.trim().toLowerCase()

        return students.filter((student) => {
            const fullName =
                `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() ||
                'Sin nombre'

            const email = student.email ?? ''
            const hasRoutine = Boolean(routinesByStudentId[student.id])

            const matchesSearch =
                searchLower.length === 0 ||
                fullName.toLowerCase().includes(searchLower) ||
                email.toLowerCase().includes(searchLower)

            const matchesFilter =
                filter === 'all' ||
                (filter === 'with' && hasRoutine) ||
                (filter === 'without' && !hasRoutine)

            return matchesSearch && matchesFilter
        })
    }, [students, routinesByStudentId, search, filter])

    const totalCount = students.length
    const filteredCount = filteredStudents.length

    return (
        <div className="space-y-5">
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {filter === 'all'
                            ? `${totalCount} alumnos`
                            : `${filteredCount} de ${totalCount} alumnos`}
                    </p>

                    {(search || filter !== 'all') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('')
                                setFilter('all')
                            }}
                            className="text-xs font-medium text-indigo-500 transition hover:text-indigo-400"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                <input
                    type="text"
                    placeholder="Buscar alumno..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
                />

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === 'all'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                            }`}
                    >
                        Todos
                    </button>

                    <button
                        type="button"
                        onClick={() => setFilter('with')}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === 'with'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                            }`}
                    >
                        Con rutina
                    </button>

                    <button
                        type="button"
                        onClick={() => setFilter('without')}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === 'without'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                            }`}
                    >
                        Sin rutina
                    </button>
                </div>
            </div>

            {filteredStudents.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                    No se encontraron alumnos con ese filtro.
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredStudents.map((student) => {
                        const fullName =
                            `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() ||
                            'Sin nombre'

                        const routineId = routinesByStudentId[student.id]

                        const routineHref = routineId
                            ? `/dashboard/routines/${routineId}`
                            : `/dashboard/routines/new?studentId=${student.id}`

                        const routineLabel = routineId ? 'Ver rutina' : 'Crear rutina'
                        const hasRoutine = Boolean(routineId)

                        return (
                            <div
                                key={student.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                            {fullName}
                                        </h2>

                                        <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
                                            {student.email || 'Sin email'}
                                        </p>

                                        <p className="mt-2 text-[11px] text-zinc-400">
                                            ID: {student.id}
                                        </p>
                                    </div>

                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${hasRoutine
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-amber-500/10 text-amber-400'
                                            }`}
                                    >
                                        {hasRoutine ? 'Rutina' : 'Sin rutina'}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <Link
                                        href={`/dashboard/students/${student.id}`}
                                        className="rounded-xl border border-zinc-300 px-3 py-2.5 text-center text-sm text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                    >
                                        Ver perfil
                                    </Link>

                                    <Link
                                        href={routineHref}
                                        className="rounded-xl border border-zinc-300 px-3 py-2.5 text-center text-sm text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                    >
                                        {routineLabel}
                                    </Link>

                                    <Link
                                        href={`/dashboard/students/${student.id}/progress`}
                                        className="col-span-2 rounded-xl bg-indigo-600 px-3 py-3 text-center text-sm font-medium text-white transition hover:bg-indigo-500"
                                    >
                                        Ver progreso
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}