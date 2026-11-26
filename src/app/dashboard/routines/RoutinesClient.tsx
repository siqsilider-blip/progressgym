'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ClipboardList, Plus, Search } from 'lucide-react'
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

function ProgramListHeader({ subtitle }: { subtitle?: string }) {
    return (
        <DashboardPageHeader
            notebook
            title="Rutinas"
            subtitle={subtitle}
            action={(
                <Link
                    href="/dashboard/templates"
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    <ClipboardList className="hidden size-4 lg:block" aria-hidden="true" />
                    Plantillas
                </Link>
            )}
        />
    )
}

function DesktopProgramList({
    students,
    routineByStudentId,
}: {
    students: Student[]
    routineByStudentId: ReadonlyMap<string, Routine>
}) {
    return (
        <table className="hidden w-full table-fixed border-collapse text-left lg:table">
            <caption className="sr-only">Rutinas por alumno</caption>
            <colgroup>
                <col className="w-[27%]" />
                <col className="w-[36%]" />
                <col className="w-[14%]" />
                <col className="w-[23%]" />
            </colgroup>
            <thead className="border-y border-border text-xs text-muted-foreground">
                <tr>
                    <th scope="col" className="py-2.5 pr-4 font-semibold">Alumno</th>
                    <th scope="col" className="py-2.5 pr-4 font-semibold">Programa</th>
                    <th scope="col" className="py-2.5 pr-2 font-semibold">Plan del alumno</th>
                    <th scope="col" className="py-2.5 text-right font-semibold">Acciones</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {students.map((student) => {
                    const routine = routineByStudentId.get(student.id)
                    const name = getStudentName(student)
                    const active = student.active_plan === 'active' || student.active_plan === true
                    const href = routine
                        ? `/dashboard/routines/${routine.id}`
                        : `/dashboard/students/${student.id}/assign-routine`

                    return (
                        <tr key={student.id} className="border-b border-border transition hover:bg-accent/40">
                            <th scope="row" className="py-2.5 pr-4 text-left font-semibold">
                                <Link
                                    href={`/dashboard/students/${student.id}`}
                                    title="Abrir perfil del alumno"
                                    className="flex min-h-9 w-fit max-w-full items-center gap-3 rounded-sm text-foreground hover:text-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-brand-soft" aria-hidden="true">
                                        {getInitials(student)}
                                    </span>
                                    <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
                                </Link>
                            </th>
                            <td className={`py-2.5 pr-4 [overflow-wrap:anywhere] ${routine ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {routine ? routine.name ?? 'Rutina asignada' : 'Sin rutina asignada'}
                            </td>
                            <td className="py-2.5 pr-2 text-xs">
                                <span className={`inline-flex items-center gap-1.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    <span className={`size-1.5 shrink-0 rounded-full ${active ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-muted-foreground'}`} aria-hidden="true" />
                                    {active ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td className="py-2.5 text-right">
                                <Link
                                    href={href}
                                    aria-label={`${routine ? 'Editar rutina' : 'Asignar rutina'} de ${name}`}
                                    className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-right text-xs font-semibold text-brand-soft transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                    {routine ? 'Editar rutina' : 'Asignar rutina'}
                                    <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                                </Link>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
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
            <TrainerPageShell notebook className="space-y-4 lg:space-y-7">
                <ProgramListHeader />
                <p role="alert" className="rounded-lg border border-destructive/25 px-4 py-3 text-sm text-destructive">{error}</p>
            </TrainerPageShell>
        )
    }

    if (students.length === 0) {
        return (
            <TrainerPageShell notebook className="space-y-4 lg:space-y-7">
                <ProgramListHeader subtitle="Programas de entrenamiento de tus alumnos" />
                <section className="rounded-xl border border-dashed border-border px-4 py-7 lg:rounded-none lg:border-x-0 lg:border-solid lg:px-0">
                    <h2 className="text-base font-semibold text-foreground">Todavía no tenés alumnos</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Agregá tu primer alumno para crear su rutina.</p>
                    <Link
                        href="/dashboard/students/new"
                        className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                        Agregar alumno
                    </Link>
                </section>
            </TrainerPageShell>
        )
    }

    return (
        <TrainerPageShell notebook className="space-y-4 lg:space-y-7">
            <ProgramListHeader subtitle={`${totalWithRoutine} asignadas · ${totalWithoutRoutine} pendientes`} />

            {/* Buscador */}
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:gap-6">
                <div className="relative lg:max-w-lg">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="search"
                        aria-label="Buscar alumno"
                        placeholder="Buscar alumno..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring lg:rounded-lg lg:bg-background"
                    />
                </div>
                <div role="group" aria-label="Filtrar rutinas" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1 lg:flex lg:gap-1.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
                    {([
                        { value: 'all', label: 'Todos' },
                        { value: 'assigned', label: 'Con rutina' },
                        { value: 'pending', label: 'Pendientes' },
                    ] as const).map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            aria-pressed={routineFilter === filter.value}
                            onClick={() => setRoutineFilter(filter.value)}
                            className={`h-8 rounded-lg px-3 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:h-9 lg:rounded-md lg:text-xs ${routineFilter === filter.value
                                ? 'bg-primary text-primary-foreground lg:bg-accent lg:text-brand-soft'
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
                <div className="rounded-xl border border-dashed border-border py-8 text-center lg:rounded-none lg:border-x-0 lg:border-solid lg:text-left">
                    <p className="text-xs font-semibold text-card-foreground lg:text-sm">Sin resultados</p>
                    <p className="mt-1 text-[11px] text-muted-foreground lg:text-xs">
                        {search.trim()
                            ? `No hay alumnos que coincidan con «${search.trim()}».`
                            : 'No hay alumnos con ese estado de rutina.'}
                    </p>
                </div>
            )}

            {filtered.length > 0 && <DesktopProgramList students={filtered} routineByStudentId={routineByStudentId} />}

            {/* Con rutina */}
            {withRoutine.length > 0 && (
                <section className="space-y-1.5 lg:hidden">
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
                <section className="space-y-1.5 lg:hidden">
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
