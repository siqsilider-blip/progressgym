'use client'

import { useMemo, useState } from 'react'

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
    active_plan?: string | null
}

type Routine = {
    id: string
    student_id: string
    name?: string | null
}

type Props = {
    students: Student[]
    routines: Routine[]
    error: string | null
}

function getStudentName(student: Student) {
    return `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
}

function getInitials(student: Student) {
    const first = student.first_name?.trim()?.[0] ?? ''
    const last = student.last_name?.trim()?.[0] ?? ''
    return `${first}${last}`.toUpperCase() || 'AL'
}

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {label}
            </span>
            <div className="h-px flex-1 bg-border" />
        </div>
    )
}

export default function RoutinesClient({ students, routines, error }: Props) {
    const [search, setSearch] = useState('')

    const routineByStudentId = useMemo(() => {
        const map = new Map<string, Routine>()
        for (const routine of routines) {
            map.set(routine.student_id, routine)
        }
        return map
    }, [routines])

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        if (!q) return students
        return students.filter((s) =>
            getStudentName(s).toLowerCase().includes(q)
        )
    }, [students, search])

    const withRoutine = filtered.filter((s) => routineByStudentId.has(s.id))
    const withoutRoutine = filtered.filter((s) => !routineByStudentId.has(s.id))

    const totalWithRoutine = students.filter((s) => routineByStudentId.has(s.id)).length
    const totalWithoutRoutine = students.length - totalWithRoutine

    if (error) {
        return (
            <div className="p-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-background p-4 pb-24 md:p-8">
            <div className="mx-auto max-w-xl space-y-6">

                {/* Header */}
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-500">
                                Progrezzia
                            </p>
                            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                                Rutinas
                            </h1>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                {totalWithRoutine} con rutina · {totalWithoutRoutine} sin asignar
                            </p>
                        </div>
                        <span className={`mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${totalWithoutRoutine === 0
                                ? 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30'
                            }`}>
                            {totalWithoutRoutine === 0 ? 'Todo al día' : `${totalWithoutRoutine} pendiente${totalWithoutRoutine !== 1 ? 's' : ''}`}
                        </span>
                    </div>
                </div>

                {/* Buscador */}
                <div className="relative">
                    <svg
                        className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-muted/40 py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-indigo-500 focus:bg-card focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>

                {/* Sin resultados */}
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-2xl">
                            🔍
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-card-foreground">Sin resultados</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                No hay alumnos que coincidan con "{search}"
                            </p>
                        </div>
                    </div>
                )}

                {/* Con rutina */}
                {withRoutine.length > 0 && (
                    <div className="space-y-3">
                        <SectionDivider label={`Con rutina · ${withRoutine.length}`} />
                        <div className="flex flex-col gap-2">
                            {withRoutine.map((student) => {
                                const routine = routineByStudentId.get(student.id)!
                                const name = getStudentName(student)
                                const isActive = student.active_plan === 'active' || student.active_plan === (true as any)

                                return (
                                    <div key={student.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:bg-zinc-900/80">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xs font-bold text-indigo-400">
                                                    {getInitials(student)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-zinc-100">{name}</p>
                                                    <p className="text-xs text-zinc-500">{routine.name ?? 'Rutina asignada'}</p>
                                                </div>
                                            </div>
                                            <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                                                {isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <a href={`/dashboard/students/${student.id}/train`} className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-indigo-500">
                                                Entrenar
                                            </a>
                                            <a href={`/dashboard/routines/${routine.id}`} className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700">
                                                Ver
                                            </a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Sin rutina */}
                {withoutRoutine.length > 0 && (
                    <div className="space-y-3">
                        <SectionDivider label={`Sin rutina · ${withoutRoutine.length}`} />
                        <div className="flex flex-col gap-2">
                            {withoutRoutine.map((student) => {
                                const name = getStudentName(student)

                                return (
                                    <div key={student.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:bg-zinc-900/80">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xs font-bold text-indigo-400">
                                                    {getInitials(student)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-zinc-100">{name}</p>
                                                    <p className="text-xs text-zinc-500">Sin rutina asignada</p>
                                                </div>
                                            </div>
                                            <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                                                Sin rutina
                                            </span>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <a href={`/dashboard/routines/new?studentId=${student.id}`} className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-indigo-500">
                                                Crear rutina
                                            </a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
