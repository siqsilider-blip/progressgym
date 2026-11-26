'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, MessageCircle, Search, X } from 'lucide-react'

type StudentRisk = {
    score: number
    level: 'low' | 'medium' | 'high' | 'critical'
}

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    active_plan: string | null
    created_at: string | null
    risk: StudentRisk | null
}

export type StudentOperation = {
    routineId: string | null
    routineName: string | null
    programWeekNumber: number | null
    totalProgramWeeks: number | null
    hasActiveSession: boolean
    isFinalWeek: boolean
}

type Filter = 'all' | 'attention' | 'in_progress' | 'without_program' | 'final_week'

type Props = {
    students: Student[]
    operationsByStudentId: Record<string, StudentOperation>
}

function getRiskBadge(level: StudentRisk['level']) {
    switch (level) {
        case 'critical':
            return { cls: 'border border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-400', tone: 'text-red-800 dark:text-red-400', label: 'Crítico' }
        case 'high':
            return { cls: 'border border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-400', tone: 'text-orange-800 dark:text-orange-400', label: 'Alto' }
        case 'medium':
            return { cls: 'border border-yellow-500/30 bg-yellow-500/10 text-yellow-800 dark:text-yellow-300', tone: 'text-yellow-800 dark:text-yellow-300', label: 'Medio' }
        case 'low':
        default:
            return { cls: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400', tone: 'text-muted-foreground', label: 'Bajo' }
    }
}


const FILTER_OPTIONS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'attention', label: 'Atención' },
    { value: 'in_progress', label: 'Entrenando' },
    { value: 'without_program', label: 'Sin programa' },
    { value: 'final_week', label: 'Última semana' },
]

const desktopAction = 'inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export default function StudentsList({ students, operationsByStudentId }: Props) {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<Filter>('all')

    const filteredStudents = useMemo(() => {
        const term = search.trim().toLowerCase()
        return students.filter((s) => {
            const fullName = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
            const operation = operationsByStudentId[s.id]
            const needsAttention =
                !operation?.routineId ||
                operation.isFinalWeek ||
                s.risk?.level === 'critical' ||
                s.risk?.level === 'high'
            const matchesSearch =
                !term ||
                fullName.toLowerCase().includes(term) ||
                (s.email ?? '').toLowerCase().includes(term) ||
                (operation?.routineName ?? '').toLowerCase().includes(term)

            const matchesFilter =
                filter === 'all' ||
                (filter === 'attention' && needsAttention) ||
                (filter === 'in_progress' && operation?.hasActiveSession) ||
                (filter === 'without_program' && !operation?.routineId) ||
                (filter === 'final_week' && operation?.isFinalWeek)

            return matchesSearch && matchesFilter
        })
    }, [students, operationsByStudentId, search, filter])

    const filterCounts = useMemo(() => ({
        all: students.length,
        attention: students.filter((student) => {
            const operation = operationsByStudentId[student.id]
            return !operation?.routineId
                || operation.isFinalWeek
                || student.risk?.level === 'critical'
                || student.risk?.level === 'high'
        }).length,
        in_progress: students.filter((student) => operationsByStudentId[student.id]?.hasActiveSession).length,
        without_program: students.filter((student) => !operationsByStudentId[student.id]?.routineId).length,
        final_week: students.filter((student) => operationsByStudentId[student.id]?.isFinalWeek).length,
    }), [students, operationsByStudentId])

    const hasActiveFilters = search.trim().length > 0 || filter !== 'all'

    return (
        <div className="space-y-3 lg:space-y-4">
            <div className="grid gap-2 lg:gap-3 xl:grid-cols-[minmax(15rem,1fr)_auto] xl:items-center">
                <label className="relative block min-w-0">
                    <span className="sr-only">Buscar alumnos</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="search"
                        placeholder="Buscar alumno, email o programa..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-11 w-full rounded-xl border border-border bg-input pl-10 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary lg:rounded-md lg:bg-background [&::-webkit-search-cancel-button]:hidden"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            aria-label="Limpiar búsqueda"
                            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </label>

                <div role="group" aria-label="Filtrar alumnos" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
                    {FILTER_OPTIONS.map((opt) => {
                        const isActive = filter === opt.value
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => setFilter(opt.value)}
                                className={`flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-ring lg:rounded-md ${isActive
                                        ? 'bg-primary text-primary-foreground lg:bg-accent lg:text-brand-soft'
                                        : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted lg:border-transparent lg:bg-transparent lg:text-muted-foreground'
                                    }`}
                            >
                                {opt.label}
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] lg:p-0 lg:text-xs lg:tabular-nums ${isActive ? 'bg-primary-foreground/15 lg:bg-transparent' : 'bg-muted lg:bg-transparent'}`}>
                                    {filterCounts[opt.value]}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Count */}
            <p role="status" className={`text-xs text-muted-foreground ${hasActiveFilters ? '' : 'lg:sr-only'}`}>
                {hasActiveFilters
                    ? `${filteredStudents.length} de ${students.length} alumnos`
                    : `${students.length} alumnos`}
            </p>

            {/* List */}
            {filteredStudents.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground lg:rounded-none lg:border-x-0 lg:bg-transparent lg:px-0">
                    No se encontraron alumnos con ese filtro.
                </div>
            ) : (
                <>
                <div className="flex flex-col gap-2 lg:hidden">
                    {filteredStudents.map((student) => {
                        const fullName =
                            `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
                        const initials =
                            `${(student.first_name?.[0] ?? '').toUpperCase()}${(student.last_name?.[0] ?? '').toUpperCase()}` || '?'
                        const operation = operationsByStudentId[student.id]
                        const hasProgram = Boolean(operation?.routineId)
                        const riskBadge = student.risk ? getRiskBadge(student.risk.level) : null
                        const status = !hasProgram
                            ? { label: 'Sin programa', cls: 'border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-300' }
                            : operation?.hasActiveSession
                                ? { label: 'Sesión en curso', cls: 'border-primary/30 bg-primary/10 text-brand-soft' }
                                : operation?.isFinalWeek
                                    ? { label: 'Última semana', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300' }
                                    : {
                                        label: `Semana ${operation?.programWeekNumber ?? 1} de ${operation?.totalProgramWeeks ?? 1}`,
                                        cls: 'border-border bg-muted text-muted-foreground',
                                    }
                        const primaryHref = hasProgram
                            ? `/dashboard/routines/${operation?.routineId}`
                            : `/dashboard/students/${student.id}/assign-routine`

                        return (
                            <div key={student.id} className="rounded-xl border border-border bg-card p-3">

                                {/* Header de la card */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xs font-bold text-primary">
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {operation?.routineName ?? student.email ?? 'Sin programa asignado'}
                                            </p>
                                        </div>
                                    </div>
                                    {riskBadge && (
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${riskBadge.cls}`}>
                                            {riskBadge.label === 'Bajo' ? 'Al día' : `Atención ${riskBadge.label.toLowerCase()}`}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2.5 flex items-center justify-between gap-2">
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${status.cls}`}>
                                        {status.label}
                                    </span>

                                    <div className="flex gap-2">
                                        <Link
                                            href={`/dashboard/students/${student.id}`}
                                            className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                                        >
                                            Perfil
                                        </Link>
                                        <Link
                                            href={primaryHref}
                                            className="rounded-lg bg-primary px-3 py-1.5 text-center text-[11px] font-semibold text-primary-foreground transition hover:bg-primary"
                                        >
                                            {hasProgram ? 'Editar rutina' : 'Asignar'}
                                        </Link>
                                    </div>
                                </div>

                            </div>
                        )
                    })}
                </div>

                <table className="hidden w-full table-fixed border-collapse text-left lg:table">
                    <caption className="sr-only">Alumnos, nivel de riesgo y programa</caption>
                    <colgroup>
                        <col className="w-[30%]" />
                        <col className="w-[12%]" />
                        <col className="w-[31%]" />
                        <col className="w-[27%]" />
                    </colgroup>
                    <thead className="border-y border-border text-xs text-muted-foreground">
                        <tr>
                            <th scope="col" className="py-3 pr-3 font-semibold">Alumno</th>
                            <th scope="col" className="px-2 py-3 font-semibold">Riesgo</th>
                            <th scope="col" className="px-2 py-3 font-semibold">Programa</th>
                            <th scope="col" className="py-3 pl-2 text-right font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => {
                            const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
                            const initials = `${(student.first_name?.[0] ?? '').toUpperCase()}${(student.last_name?.[0] ?? '').toUpperCase()}` || '?'
                            const operation = operationsByStudentId[student.id]
                            const hasProgram = Boolean(operation?.routineId)
                            const riskBadge = student.risk ? getRiskBadge(student.risk.level) : null

                            return (
                                <tr key={student.id} className="border-b border-border text-sm transition hover:bg-accent/30">
                                    <th scope="row" className="py-3 pr-3 font-normal">
                                        <Link href={`/dashboard/students/${student.id}`} className="group flex min-w-0 items-center gap-3 rounded-md py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                                            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-brand-soft">
                                                {initials}
                                            </span>
                                            <span className="min-w-0 [overflow-wrap:anywhere]">
                                                <span className="block font-semibold text-foreground group-hover:underline">{fullName}</span>
                                                <span className="mt-0.5 block text-xs text-muted-foreground">{student.email || 'Sin email vinculado'}</span>
                                            </span>
                                        </Link>
                                    </th>

                                    <td className="px-2 py-3">
                                        {riskBadge ? (
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${riskBadge.tone}`}>
                                                <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
                                                {riskBadge.label}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sin datos</span>
                                        )}
                                    </td>

                                    <td className="px-2 py-3 [overflow-wrap:anywhere]">
                                        {operation?.hasActiveSession ? (
                                            <>
                                                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Sesión en curso</p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">{operation.routineName}</p>
                                            </>
                                        ) : hasProgram ? (
                                            <>
                                                <p className="text-sm font-medium text-foreground">{operation.routineName}</p>
                                                <p className={`mt-0.5 text-xs ${operation.isFinalWeek ? 'font-semibold text-amber-800 dark:text-amber-300' : 'text-muted-foreground'}`}>
                                                    Semana {operation.programWeekNumber} de {operation.totalProgramWeeks}
                                                </p>
                                            </>
                                        ) : (
                                            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Sin programa</span>
                                        )}
                                    </td>

                                    <td className="py-2 pl-2">
                                        <div className="flex flex-wrap items-center justify-end gap-x-1">
                                            <Link
                                                href={`/dashboard/messages?student=${student.id}`}
                                                aria-label={`Enviar mensaje a ${fullName}`}
                                                className={`${desktopAction} text-muted-foreground`}
                                            >
                                                <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
                                                Mensaje
                                            </Link>
                                            <Link
                                                href={hasProgram
                                                    ? `/dashboard/routines/${operation.routineId}`
                                                    : `/dashboard/students/${student.id}/assign-routine`}
                                                className={`${desktopAction} text-brand-soft`}
                                            >
                                                {hasProgram ? 'Editar rutina' : 'Asignar rutina'}
                                                <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                </>
            )}
        </div>
    )
}
