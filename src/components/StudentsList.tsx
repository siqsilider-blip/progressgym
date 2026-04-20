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
            return { cls: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400', label: 'Crítico' }
        case 'high':
            return { cls: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400', label: 'Alto' }
        case 'medium':
            return { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', label: 'Medio' }
        case 'low':
        default:
            return { cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400', label: 'Bajo' }
    }
}

function getWhatsappLink(name: string | null, riskLevel: StudentRisk['level']) {
    const safeName = name?.trim() || ''
    const message =
        riskLevel === 'critical' || riskLevel === 'high'
            ? `Hola ${safeName}, vi que esta semana bajó un poco la constancia. ¿Te organizo algo más simple para retomar?`
            : `Hola ${safeName}, ¿cómo venís con la rutina? Cualquier cosa ajustamos.`
    return `https://wa.me/?text=${encodeURIComponent(message)}`
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
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                                isActive
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
                <div className="space-y-2">
                    {filteredStudents.map((student) => {
                        const fullName =
                            `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Sin nombre'
                        const routineId = routinesByStudentId[student.id]
                        const routineHref = routineId
                            ? `/dashboard/routines/${routineId}`
                            : `/dashboard/routines/new?studentId=${student.id}`
                        const routineLabel = routineId ? 'Rutina' : 'Crear rutina'
                        const badge = getRiskBadge(student.risk.level)

                        return (
                            <div
                                key={student.id}
                                className="rounded-xl border border-border bg-card p-3.5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {fullName}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                            {student.email || 'Sin email'}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>
                                        {badge.label}
                                    </span>
                                </div>

                                <div className="mt-3 flex items-center gap-2">
                                    <Link
                                        href={`/dashboard/students/${student.id}`}
                                        className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
                                    >
                                        Ver perfil
                                    </Link>

                                    <Link
                                        href={routineHref}
                                        className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                                    >
                                        {routineLabel}
                                    </Link>

                                    <a
                                        href={getWhatsappLink(student.first_name, student.risk.level)}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Contactar por WhatsApp"
                                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                                    >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.852L.054 23.5a.5.5 0 0 0 .609.61l5.805-1.503A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.878 9.878 0 0 1-5.031-1.378l-.36-.214-3.732.966.998-3.62-.235-.374A9.86 9.86 0 0 1 2.1 12C2.1 6.533 6.533 2.1 12 2.1c5.467 0 9.9 4.433 9.9 9.9 0 5.467-4.433 9.9-9.9 9.9z"/>
                                        </svg>
                                        Wsp
                                    </a>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
