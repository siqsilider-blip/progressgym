'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Plus, Search } from 'lucide-react'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
    active_plan?: string | boolean | null
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

type RoutineFilter = 'all' | 'assigned' | 'pending'

function getStudentName(student: Student) {
    return `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
}

function getInitials(student: Student) {
    const first = student.first_name?.trim()?.[0] ?? ''
    const last = student.last_name?.trim()?.[0] ?? ''
    return `${first}${last}`.toUpperCase() || 'AL'
}

function SectionHeading({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {label}
            </h2>
            <span className="text-[11px] font-semibold text-muted-foreground">{count}</span>
        </div>
    )
}

export default function RoutinesClient({ students, routines, error }: Props) {
    const [search, setSearch] = useState('')
    const [routineFilter, setRoutineFilter] = useState<RoutineFilter>('all')

    const routineByStudentId = useMemo(() => {
        const map = new Map<string, Routine>()
        for (const routine of routines) {
            map.set(routine.student_id, routine)
        }
        return map
    }, [routines])

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        return students.filter((student) => {
            const hasRoutine = routineByStudentId.has(student.id)
            const matchesSearch = !q || getStudentName(student).toLowerCase().includes(q)
            const matchesFilter = routineFilter === 'all'
                || (routineFilter === 'assigned' && hasRoutine)
                || (routineFilter === 'pending' && !hasRoutine)
            return matchesSearch && matchesFilter
        })
    }, [students, search, routineFilter, routineByStudentId])

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
        <TrainerPageShell className="space-y-4">

                {/* Header */}
                <DashboardPageHeader
                    title="Rutinas"
                    subtitle={`${totalWithRoutine} asignadas · ${totalWithoutRoutine} pendientes`}
                    action={
                        <Link
                            href="/dashboard/templates"
                            className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/15"
                        >
                            Templates
                        </Link>
                    }
                />

                {/* Buscador */}
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar alumno..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/60 focus:bg-background"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1">
                        {([
                            { value: 'all', label: 'Todos' },
                            { value: 'assigned', label: 'Con rutina' },
                            { value: 'pending', label: 'Pendientes' },
                        ] as const).map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() => setRoutineFilter(filter.value)}
                                className={`h-8 rounded-lg px-3 text-[11px] font-semibold transition ${routineFilter === filter.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sin resultados */}
                {filtered.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border py-8 text-center">
                        <p className="text-xs font-semibold text-card-foreground">Sin resultados</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            No hay alumnos que coincidan con &ldquo;{search}&rdquo;
                        </p>
                    </div>
                )}

                {filtered.length > 0 && (
                    <section className="hidden overflow-hidden rounded-2xl border border-border bg-card xl:block">
                        <div className="grid grid-cols-[minmax(13rem,1.2fr)_minmax(14rem,1fr)_8rem_minmax(18rem,auto)] items-center gap-4 border-b border-border bg-muted px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            <span>Alumno</span>
                            <span>Programa</span>
                            <span>Estado</span>
                            <span className="text-right">Acciones</span>
                        </div>
                        <div className="divide-y divide-border">
                            {filtered.map((student) => {
                                const routine = routineByStudentId.get(student.id)
                                const name = getStudentName(student)
                                const isActive = student.active_plan === 'active' || student.active_plan === true

                                return (
                                    <div key={student.id} className="grid grid-cols-[minmax(13rem,1.2fr)_minmax(14rem,1fr)_8rem_minmax(18rem,auto)] items-center gap-4 px-4 py-3 transition hover:bg-accent/65">
                                        <Link href={`/dashboard/students/${student.id}`} className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-xs font-bold text-primary">
                                                {getInitials(student)}
                                            </span>
                                            <span className="truncate text-sm font-semibold text-card-foreground">{name}</span>
                                        </Link>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-card-foreground">{routine?.name ?? 'Sin rutina asignada'}</p>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">{routine ? 'Disponible para editar' : 'Requiere planificación'}</p>
                                        </div>
                                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                            {isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/dashboard/students/${student.id}`} className="rounded-lg border border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground">
                                                Perfil
                                            </Link>
                                            {routine ? (
                                                <Link href={`/dashboard/routines/${routine.id}`} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground transition hover:brightness-110">
                                                    Editar rutina
                                                </Link>
                                            ) : (
                                                <Link href={`/dashboard/students/${student.id}/assign-routine`} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground transition hover:brightness-110">
                                                    Asignar rutina
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Con rutina */}
                {withRoutine.length > 0 && (
                    <section className="space-y-1.5 xl:hidden">
                        <SectionHeading label="Con rutina" count={withRoutine.length} />
                        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                            {withRoutine.map((student) => {
                                const routine = routineByStudentId.get(student.id)!
                                const name = getStudentName(student)
                                const isActive = student.active_plan === 'active' || student.active_plan === true

                                return (
                                    <div key={student.id} className="flex min-h-14 items-center gap-2 px-2.5 py-2 transition hover:bg-accent/65">
                                        <Link href={`/dashboard/routines/${routine.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-[10px] font-bold text-primary">
                                                    {getInitials(student)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="truncate text-xs font-semibold text-card-foreground">{name}</p>
                                                        <span
                                                            title={isActive ? 'Plan activo' : 'Plan inactivo'}
                                                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                                                        />
                                                    </div>
                                                    <p className="truncate text-[11px] text-muted-foreground">{routine.name ?? 'Rutina asignada'}</p>
                                                </div>
                                        </Link>
                                        <Link href={`/dashboard/routines/${routine.id}`} aria-label={`Ver rutina de ${name}`} className="p-1 text-muted-foreground hover:text-foreground">
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Sin rutina */}
                {withoutRoutine.length > 0 && (
                    <section className="space-y-1.5 xl:hidden">
                        <SectionHeading label="Pendientes" count={withoutRoutine.length} />
                        <div className="divide-y divide-border overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/[0.025]">
                            {withoutRoutine.map((student) => {
                                const name = getStudentName(student)

                                return (
                                    <Link
                                        key={student.id}
                                        href={`/dashboard/students/${student.id}/assign-routine`}
                                        className="flex min-h-14 items-center gap-2.5 px-2.5 py-2 transition hover:bg-amber-500/[0.04]"
                                    >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">
                                                    {getInitials(student)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-semibold text-card-foreground">{name}</p>
                                                    <p className="text-[11px] text-amber-800 dark:text-amber-400">Asignar programa</p>
                                                </div>
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-400">
                                            <Plus className="h-3.5 w-3.5" />
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    </section>
                )}
        </TrainerPageShell>
    )
}
