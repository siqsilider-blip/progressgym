'use client'

import { useMemo, useState } from 'react'

type StudentRisk = {
    score: number
    level: 'low' | 'medium' | 'high' | 'critical'
}

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    active_plan: string | null
    created_at: string | null
    risk: StudentRisk
}

type RoutineMap = Record<string, string>

type Filter = 'all' | 'with_routine' | 'without_routine' | 'at_risk'

type Props = {
    students: Student[]
    routinesByStudentId: RoutineMap
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
    { value: 'with_routine', label: 'Con rutina' },
    { value: 'without_routine', label: 'Sin rutina' },
    { value: 'at_risk', label: 'En riesgo' },
]

export default function StudentsList({ students, routinesByStudentId }: Props) {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<Filter>('all')

    const filteredStudents = useMemo(() => {
        const term = search.trim().toLowerCase()
        return students.filter((s) => {
            const fullName = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
            const matchesSearch =
                !term ||
                fullName.toLowerCase().includes(term) ||
                (s.email ?? '').toLowerCase().includes(term)

            const hasRoutine = Boolean(routinesByStudentId[s.id])
            const matchesFilter =
                filter === 'all' ||
                (filter === 'with_routine' && hasRoutine) ||
                (filter === 'without_routine' && !hasRoutine) ||
                (filter === 'at_risk' && (s.risk.level === 'critical' || s.risk.level === 'high'))

            return matchesSearch && matchesFilter
        })
    }, [students, routinesByStudentId, search, filter])

    const hasActiveFilters = search.trim().length > 0 || filter !== 'all'

    return (
        <div className="space-y-3">
            {/* Search */}
            <input
                type="text"
                placeholder="Buscar alumno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />

            {/* Filter chips */}
            <div className="flex flex-wrap gap-1.5">
                {FILTER_OPTIONS.map((opt) => {
                    const isActive = filter === opt.value
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFilter(opt.value)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${isActive
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
                        className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
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
                <div className="flex flex-col gap-3">
                    {filteredStudents.map((student) => {
                        const fullName =
                            `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
                        const initials =
                            `${(student.first_name?.[0] ?? '').toUpperCase()}${(student.last_name?.[0] ?? '').toUpperCase()}` || '?'
                        const { cls: riskBadgeClass, label: riskLabel } = getRiskBadge(student.risk.level)

                        return (
                            <div key={student.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3 shadow-sm">

                                {/* Header de la card */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xs font-bold text-indigo-400">
                                            {initials}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{fullName}</p>
                                            <p className="text-[11px] text-muted-foreground">{student.email ?? 'Sin email'}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${riskBadgeClass}`}>
                                        {riskLabel}
                                    </span>
                                </div>

                                {/* Botones */}
                                <div className="mt-3 flex gap-2">
                                    <a
                                        href={`/dashboard/students/${student.id}`}
                                        className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-indigo-500"
                                    >
                                        Ver perfil
                                    </a>
                                    <a
                                        href={`/dashboard/routines?student=${student.id}`}
                                        className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
                                    >
                                        Rutina
                                    </a>
                                    {student.phone && (
                                        <a
                                            href={`https://wa.me/${student.phone}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                                        >
                                            Wsp
                                        </a>
                                    )}
                                </div>

                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
