'use client'

import { useMemo, useState } from 'react'
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

function getStudentName(student: Student) {
    const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
    return fullName || 'Alumno sin nombre'
}

function getInitials(student: Student) {
    const first = student.first_name?.trim()?.[0] ?? ''
    const last = student.last_name?.trim()?.[0] ?? ''

    const initials = `${first}${last}`.toUpperCase()
    return initials || 'AL'
}

export default function RoutinesClient({
    students,
    routines,
    error,
}: Props) {
    const [studentId, setStudentId] = useState('')

    const routineByStudentId = useMemo(() => {
        const map = new Map<string, string>()

        for (const routine of routines) {
            map.set(routine.student_id, routine.id)
        }

        return map
    }, [routines])

    const studentById = useMemo(() => {
        const map = new Map<string, Student>()

        for (const student of students) {
            map.set(student.id, student)
        }

        return map
    }, [students])

    const selectedStudent = studentId ? studentById.get(studentId) ?? null : null
    const selectedRoutineId = studentId
        ? routineByStudentId.get(studentId) ?? null
        : null

    return (
        <div className="mx-auto max-w-xl px-4 py-6">
            <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
                    ProgressGym
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Rutinas
                </h1>

                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Elegí un alumno para ver, crear o editar su rutina.
                </p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="space-y-2">
                    <label
                        htmlFor="student"
                        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400"
                    >
                        Alumno
                    </label>

                    <select
                        id="student"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                        <option value="">Seleccionar alumno...</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {getStudentName(student)}
                            </option>
                        ))}
                    </select>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                        {error}
                    </div>
                )}

                {selectedStudent && !error && (
                    <div className="mt-5 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/90 text-sm font-bold text-white">
                                {getInitials(selectedStudent)}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    {getStudentName(selectedStudent)}
                                </p>

                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {selectedRoutineId
                                        ? 'Rutina asignada'
                                        : 'Todavía no tiene rutina'}
                                </p>
                            </div>
                        </div>

                        {selectedRoutineId ? (
                            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                                            Rutina activa
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                            Lista para entrenar
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                            Podés entrar directo a entrenar o editar la rutina.
                                        </p>
                                    </div>

                                    <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                        Activa
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <Link
                                        href={`/dashboard/students/${selectedStudent.id}/train`}
                                        className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500"
                                    >
                                        Entrenar
                                    </Link>

                                    <Link
                                        href={`/dashboard/routines/${selectedRoutineId}`}
                                        className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                                    >
                                        Editar rutina
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-center dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                                    <svg
                                        className="h-6 w-6"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 5v14M5 12h14"
                                        />
                                    </svg>
                                </div>

                                <p className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    Este alumno todavía no tiene rutina
                                </p>

                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                    Creá una rutina para empezar a planificar su entrenamiento.
                                </p>

                                <Link
                                    href={`/dashboard/routines/new?studentId=${selectedStudent.id}`}
                                    className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                                >
                                    Crear rutina
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}