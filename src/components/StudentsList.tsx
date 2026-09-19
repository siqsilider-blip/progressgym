'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

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

    const hasActiveFilters = search.trim().length > 0 || filter !== 'all'

    return (
        <div className="space-y-3">
            {/* Search */}
            <input
                type="text"
                placeholder="Buscar alumno o programa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />

            {/* Filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {FILTER_OPTIONS.map((opt) => {
                    const isActive = filter === opt.value
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFilter(opt.value)}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                }`}
                        >
                            {opt.label}
                        </button>
                    )
                })}

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={() => { setSearch(''); setFilter('all') }}
                        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                    >
                        Limpiar
                    </button>
                )}
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
                <div className="flex flex-col gap-2">
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
                                ? { label: 'Sesión en curso', cls: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' }
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
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xs font-bold text-indigo-400">
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
                                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-[11px] font-semibold text-white transition hover:bg-indigo-500"
                                        >
                                            {operation?.hasActiveSession ? 'Continuar' : hasProgram ? 'Entrenar' : 'Asignar'}
                                        </Link>
                                    </div>
                                </div>

                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
