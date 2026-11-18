'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Search, X } from 'lucide-react'

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
            return { cls: 'border border-red-500/30 bg-red-500/10 text-red-400', label: 'Crítico' }
        case 'high':
            return { cls: 'border border-orange-500/30 bg-orange-500/10 text-orange-400', label: 'Alto' }
        case 'medium':
            return { cls: 'border border-yellow-500/30 bg-yellow-500/10 text-yellow-300', label: 'Medio' }
        case 'low':
        default:
            return { cls: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400', label: 'Bajo' }
    }
}


const FILTER_OPTIONS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'attention', label: 'Atención' },
    { value: 'in_progress', label: 'Entrenando' },
    { value: 'without_program', label: 'Sin programa' },
    { value: 'final_week', label: 'Última semana' },
]

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
        <div className="space-y-3">
            <div className="grid gap-2 xl:grid-cols-[minmax(18rem,1fr)_auto] xl:items-center">
                <label className="relative block min-w-0">
                    <span className="sr-only">Buscar alumnos</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Buscar alumno, email o programa..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-11 w-full rounded-xl border border-border bg-input pl-10 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
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

                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] xl:grid xl:grid-cols-5 xl:rounded-xl xl:border xl:border-border xl:bg-card xl:p-1 [&::-webkit-scrollbar]:hidden">
                {FILTER_OPTIONS.map((opt) => {
                    const isActive = filter === opt.value
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFilter(opt.value)}
                            className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted xl:border-transparent xl:bg-transparent'
                                }`}
                        >
                            {opt.label}
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${isActive ? 'bg-black/15' : 'bg-white/[0.05]'}`}>
                                {filterCounts[opt.value]}
                            </span>
                        </button>
                    )
                })}
                </div>
            </div>

            {/* Count */}
            <p className="text-xs text-muted-foreground">
                {hasActiveFilters
                    ? `${filteredStudents.length} de ${students.length} alumnos`
                    : `${students.length} alumnos`}
            </p>

            {/* List */}
            {filteredStudents.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    No se encontraron alumnos con ese filtro.
                </div>
            ) : (
                <>
                <div className="flex flex-col gap-2 xl:hidden">
                    {filteredStudents.map((student) => {
                        const fullName =
                            `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
                        const initials =
                            `${(student.first_name?.[0] ?? '').toUpperCase()}${(student.last_name?.[0] ?? '').toUpperCase()}` || '?'
                        const operation = operationsByStudentId[student.id]
                        const hasProgram = Boolean(operation?.routineId)
                        const riskBadge = student.risk ? getRiskBadge(student.risk.level) : null
                        const status = !hasProgram
                            ? { label: 'Sin programa', cls: 'border-rose-500/25 bg-rose-500/10 text-rose-300' }
                            : operation?.hasActiveSession
                                ? { label: 'Sesión en curso', cls: 'border-primary/30 bg-primary/10 text-brand-soft' }
                                : operation?.isFinalWeek
                                    ? { label: 'Última semana', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
                                    : {
                                        label: `Semana ${operation?.programWeekNumber ?? 1} de ${operation?.totalProgramWeeks ?? 1}`,
                                        cls: 'border-white/10 bg-white/[0.04] text-white/55',
                                    }
                        const primaryHref = hasProgram
                            ? `/dashboard/students/${student.id}/train`
                            : `/dashboard/students/${student.id}/assign-routine`

                        return (
                            <div key={student.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">

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
                                            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                                        >
                                            Perfil
                                        </Link>
                                        <Link
                                            href={primaryHref}
                                            className="rounded-lg bg-primary px-3 py-1.5 text-center text-[11px] font-semibold text-primary-foreground transition hover:bg-primary"
                                        >
                                            {operation?.hasActiveSession ? 'Continuar' : hasProgram ? 'Entrenar' : 'Asignar'}
                                        </Link>
                                    </div>
                                </div>

                            </div>
                        )
                    })}
                </div>

                <div className="hidden overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015] xl:block">
                    <div className="grid grid-cols-[minmax(12rem,1.3fr)_6rem_minmax(11rem,1fr)_minmax(20rem,auto)] items-center gap-4 border-b border-white/[0.06] bg-white/[0.025] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white/25">
                        <span>Alumno</span>
                        <span>Riesgo</span>
                        <span>Programa</span>
                        <span className="text-right">Acciones</span>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                        {filteredStudents.map((student) => {
                            const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
                            const initials = `${(student.first_name?.[0] ?? '').toUpperCase()}${(student.last_name?.[0] ?? '').toUpperCase()}` || '?'
                            const operation = operationsByStudentId[student.id]
                            const hasProgram = Boolean(operation?.routineId)
                            const riskBadge = student.risk ? getRiskBadge(student.risk.level) : null

                            return (
                                <div key={student.id} className="grid grid-cols-[minmax(12rem,1.3fr)_6rem_minmax(11rem,1fr)_minmax(20rem,auto)] items-center gap-4 px-5 py-3.5 text-sm transition hover:bg-white/[0.025]">
                                    <Link href={`/dashboard/students/${student.id}`} className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-[11px] font-black text-brand-soft">
                                            {initials}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate font-semibold text-white">{fullName}</span>
                                            <span className="mt-0.5 block truncate text-[10px] text-white/30">{student.email || 'Sin email vinculado'}</span>
                                        </span>
                                    </Link>

                                    <div>
                                        {riskBadge ? (
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${riskBadge.cls}`}>
                                                {riskBadge.label}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-white/30">Sin datos</span>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        {operation?.hasActiveSession ? (
                                            <>
                                                <p className="truncate text-xs font-semibold text-emerald-300">Sesión en curso</p>
                                                <p className="mt-0.5 truncate text-[10px] text-white/30">{operation.routineName}</p>
                                            </>
                                        ) : hasProgram ? (
                                            <>
                                                <p className="truncate text-xs font-medium text-white/65">{operation.routineName}</p>
                                                <p className={`mt-0.5 text-[10px] ${operation.isFinalWeek ? 'font-semibold text-amber-300' : 'text-white/30'}`}>
                                                    Semana {operation.programWeekNumber} de {operation.totalProgramWeeks}
                                                </p>
                                            </>
                                        ) : (
                                            <span className="text-xs font-semibold text-rose-300">Sin programa</span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-end gap-2">
                                        <Link
                                            href={`/dashboard/messages?student=${student.id}`}
                                            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-[11px] font-semibold text-white/50 transition hover:bg-white/[0.05] hover:text-white"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            Mensaje
                                        </Link>
                                        <Link
                                            href={`/dashboard/students/${student.id}`}
                                            className="flex h-9 items-center rounded-lg border border-white/[0.08] px-3 text-[11px] font-semibold text-white/50 transition hover:bg-white/[0.05] hover:text-white"
                                        >
                                            Perfil
                                        </Link>
                                        {hasProgram && (
                                            <Link
                                                href={`/dashboard/students/${student.id}/train`}
                                                className="flex h-9 items-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
                                            >
                                                {operation?.hasActiveSession ? 'Continuar' : 'Entrenar'}
                                            </Link>
                                        )}
                                        <Link
                                            href={hasProgram
                                                ? `/dashboard/routines/${operation.routineId}`
                                                : `/dashboard/students/${student.id}/assign-routine`}
                                            className="flex h-9 items-center rounded-lg bg-primary px-3 text-[11px] font-bold text-primary-foreground transition hover:brightness-110"
                                        >
                                            {hasProgram ? 'Editar rutina' : 'Asignar rutina'}
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                </>
            )}
        </div>
    )
}
