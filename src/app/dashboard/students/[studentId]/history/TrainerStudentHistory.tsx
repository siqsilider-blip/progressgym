'use client'

import { useMemo, useState } from 'react'
import {
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Dumbbell,
    Search,
    StickyNote,
    TriangleAlert,
} from 'lucide-react'
import type { SessionHistoryItem } from '@/app/dashboard/students/getStudentSessionHistory'
import { formatWeight, type WeightUnit } from '@/lib/weight'

type StatusFilter = 'all' | 'complete' | 'incomplete'

type TrainerStudentHistoryProps = {
    sessions: SessionHistoryItem[]
    weightUnit: WeightUnit
    visibleLimit: number
}

function formatDate(dateStr: string, long = false) {
    const date = new Date(`${dateStr}T00:00:00`)
    return date.toLocaleDateString('es-AR', long
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    if (secs === 0) return `${mins}m`
    return `${mins}m ${secs}s`
}

function getMonthKey(dateStr: string) {
    return dateStr.slice(0, 7)
}

function formatMonth(dateStr: string) {
    const date = new Date(`${dateStr.slice(0, 7)}-01T00:00:00`)
    return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function groupSessionsByMonth(sessions: SessionHistoryItem[]) {
    const groups = new Map<string, SessionHistoryItem[]>()

    for (const session of sessions) {
        const key = getMonthKey(session.performedDate)
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(session)
    }

    return [...groups.entries()]
}

function StatusBadge({ status }: { status: SessionHistoryItem['completionStatus'] }) {
    if (status === 'complete') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-500">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Completa
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-500">
            <TriangleAlert className="h-3 w-3" aria-hidden="true" />
            Parcial
        </span>
    )
}

function SessionMeta({ session }: { session: SessionHistoryItem }) {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {session.durationSeconds !== null && session.durationSeconds > 0 && (
                <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" aria-hidden="true" />
                    {formatDuration(session.durationSeconds)}
                </span>
            )}
            <span className="inline-flex items-center gap-1">
                <Dumbbell className="h-3 w-3" aria-hidden="true" />
                {session.totalSets} {session.totalSets === 1 ? 'serie' : 'series'}
            </span>
            <span>
                {session.exercises.length} {session.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
            </span>
            {session.note && (
                <span className="inline-flex items-center gap-1 text-primary">
                    <StickyNote className="h-3 w-3" aria-hidden="true" />
                    Con nota
                </span>
            )}
        </div>
    )
}

function getBestResult(
    exercise: SessionHistoryItem['exercises'][number],
    weightUnit: WeightUnit
) {
    if (exercise.isCardio) {
        return exercise.bestReps !== null ? `${exercise.bestReps} min` : '—'
    }

    const values: string[] = []
    if (exercise.bestWeight !== null && exercise.bestWeight > 0) {
        values.push(`Máx. peso ${formatWeight(exercise.bestWeight, weightUnit)}`)
    }
    if (exercise.bestReps !== null) values.push(`Máx. reps ${exercise.bestReps}`)
    return values.length > 0 ? values.join(' · ') : '—'
}

function SessionExerciseDetails({
    session,
    weightUnit,
}: {
    session: SessionHistoryItem
    weightUnit: WeightUnit
}) {
    return (
        <>
            {session.exercises.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border">
                    <div className="hidden grid-cols-[minmax(0,1fr)_72px_160px_72px] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                        <span>Ejercicio</span>
                        <span className="text-center">Series</span>
                        <span className="text-right">Mejores valores</span>
                        <span className="text-right">Esfuerzo</span>
                    </div>

                    <div className="divide-y divide-border">
                        {session.exercises.map((exercise) => (
                            <div
                                key={exercise.routineDayExerciseId}
                                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_72px_160px_72px]"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold leading-5 text-card-foreground">
                                        {exercise.exerciseName}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground md:hidden">
                                        {exercise.sets} {exercise.sets === 1 ? 'serie' : 'series'}
                                        {exercise.avgRpe !== null ? ` · RPE ${exercise.avgRpe}` : ''}
                                    </p>
                                </div>

                                <p className="hidden text-center text-xs font-semibold text-card-foreground md:block">
                                    {exercise.sets}
                                </p>

                                <p className="text-right text-xs font-bold text-emerald-500">
                                    {getBestResult(exercise, weightUnit)}
                                </p>

                                <p className="hidden text-right text-xs font-medium text-muted-foreground md:block">
                                    {exercise.avgRpe !== null ? `RPE ${exercise.avgRpe}` : '—'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                    No hay ejercicios disponibles para esta sesión.
                </div>
            )}

            {session.note && (
                <div className="mt-3 rounded-xl border border-primary/15 bg-primary/[0.06] px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                        <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                        Nota de la alumna
                    </p>
                    <p className="mt-1 text-sm leading-6 text-card-foreground">{session.note}</p>
                </div>
            )}
        </>
    )
}

function DesktopSessionDetail({
    session,
    weightUnit,
}: {
    session: SessionHistoryItem
    weightUnit: WeightUnit
}) {
    const headingId = `history-session-${session.sessionId}`

    return (
        <section
            id="trainer-history-detail"
            aria-labelledby={headingId}
            aria-live="polite"
            className="h-full overflow-y-auto rounded-2xl border border-border bg-card"
        >
            <div className="border-b border-border px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDate(session.performedDate, true)}
                        </p>
                        <h2 id={headingId} className="mt-1 text-xl font-black text-card-foreground">
                            {session.dayLabel}
                        </h2>
                    </div>
                    <StatusBadge status={session.completionStatus} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                        <p className="text-[11px] text-muted-foreground">Duración</p>
                        <p className="mt-0.5 text-sm font-bold text-card-foreground">
                            {session.durationSeconds !== null && session.durationSeconds > 0
                                ? formatDuration(session.durationSeconds)
                                : '—'}
                        </p>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                        <p className="text-[11px] text-muted-foreground">Series</p>
                        <p className="mt-0.5 text-sm font-bold text-card-foreground">{session.totalSets}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                        <p className="text-[11px] text-muted-foreground">Ejercicios</p>
                        <p className="mt-0.5 text-sm font-bold text-card-foreground">{session.exercises.length}</p>
                    </div>
                </div>
            </div>

            <div className="p-5">
                <SessionExerciseDetails session={session} weightUnit={weightUnit} />
            </div>
        </section>
    )
}

export default function TrainerStudentHistory({
    sessions,
    weightUnit,
    visibleLimit,
}: TrainerStudentHistoryProps) {
    const [query, setQuery] = useState('')
    const [monthFilter, setMonthFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.sessionId ?? null)

    const monthOptions = useMemo(() => {
        const seen = new Set<string>()
        return sessions.flatMap((session) => {
            const key = getMonthKey(session.performedDate)
            if (seen.has(key)) return []
            seen.add(key)
            return [{ key, label: formatMonth(session.performedDate) }]
        })
    }, [sessions])

    const filteredSessions = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase('es-AR')

        return sessions.filter((session) => {
            if (monthFilter !== 'all' && getMonthKey(session.performedDate) !== monthFilter) return false
            if (statusFilter !== 'all' && session.completionStatus !== statusFilter) return false
            if (!normalizedQuery) return true

            const searchableText = [
                session.dayLabel,
                session.note ?? '',
                ...session.exercises.map((exercise) => exercise.exerciseName),
            ].join(' ').toLocaleLowerCase('es-AR')

            return searchableText.includes(normalizedQuery)
        })
    }, [monthFilter, query, sessions, statusFilter])

    const groupedSessions = useMemo(
        () => groupSessionsByMonth(filteredSessions),
        [filteredSessions]
    )

    const selectedSession = filteredSessions.find((session) => session.sessionId === selectedSessionId)
        ?? filteredSessions[0]
        ?? null

    const showFilters = sessions.length > 8
    const hasActiveFilters = query.trim() !== '' || monthFilter !== 'all' || statusFilter !== 'all'

    function clearFilters() {
        setQuery('')
        setMonthFilter('all')
        setStatusFilter('all')
    }

    return (
        <section aria-label="Sesiones registradas" className="space-y-3">
            {showFilters && (
                <div className="rounded-2xl border border-border bg-card p-3">
                    <div className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_210px_auto]">
                        <label className="relative block">
                            <span className="sr-only">Buscar en el historial</span>
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Buscar día, ejercicio o nota"
                                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </label>

                        <label>
                            <span className="sr-only">Filtrar por mes</span>
                            <select
                                value={monthFilter}
                                onChange={(event) => setMonthFilter(event.target.value)}
                                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                            >
                                <option value="all">Todos los meses</option>
                                {monthOptions.map((month) => (
                                    <option key={month.key} value={month.key}>{month.label}</option>
                                ))}
                            </select>
                        </label>

                        <div role="group" className="grid grid-cols-3 rounded-xl border border-border bg-background p-1" aria-label="Filtrar por estado">
                            {([
                                ['all', 'Todas'],
                                ['complete', 'Completas'],
                                ['incomplete', 'Parciales'],
                            ] as const).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={statusFilter === value}
                                    onClick={() => setStatusFilter(value)}
                                    className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${statusFilter === value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                        <p>
                            {filteredSessions.length} de {sessions.length} {sessions.length === 1 ? 'sesión visible' : 'sesiones visibles'}
                            {sessions.length === visibleLimit ? ` · últimas ${visibleLimit}` : ''}
                        </p>
                        {hasActiveFilters && (
                            <button type="button" onClick={clearFilters} className="font-semibold text-primary hover:underline">
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
            )}

            {filteredSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
                    <Search className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-card-foreground">No encontramos sesiones con esos filtros</p>
                    <button type="button" onClick={clearFilters} className="mt-2 text-xs font-semibold text-primary hover:underline">
                        Ver todo el historial
                    </button>
                </div>
            ) : (
                <>
                    <div className="hidden gap-4 xl:grid xl:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="h-[calc(100dvh-17rem)] min-h-[28rem] max-h-[48rem] overflow-y-auto rounded-2xl border border-border bg-card p-2">
                            {groupedSessions.map(([monthKey, monthSessions]) => (
                                <div key={monthKey} className="mb-3 last:mb-0">
                                    <div className="sticky top-0 z-10 flex items-center justify-between bg-card/95 px-2 py-2 backdrop-blur">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                            {formatMonth(monthSessions[0].performedDate)}
                                        </p>
                                        <span className="text-[11px] text-muted-foreground">{monthSessions.length}</span>
                                    </div>

                                    <div className="space-y-1">
                                        {monthSessions.map((session) => {
                                            const isSelected = selectedSession?.sessionId === session.sessionId
                                            return (
                                                <button
                                                    key={session.sessionId}
                                                    type="button"
                                                    aria-pressed={isSelected}
                                                    aria-controls="trainer-history-detail"
                                                    onClick={() => setSelectedSessionId(session.sessionId)}
                                                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${isSelected
                                                        ? 'border-primary/35 bg-primary/[0.08] shadow-sm'
                                                        : 'border-transparent hover:border-border hover:bg-muted/40'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-bold text-card-foreground">{session.dayLabel}</p>
                                                            <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">{formatDate(session.performedDate)}</p>
                                                        </div>
                                                        <StatusBadge status={session.completionStatus} />
                                                    </div>
                                                    <div className="mt-2">
                                                        <SessionMeta session={session} />
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="h-[calc(100dvh-17rem)] min-h-[28rem] max-h-[48rem] min-w-0">
                            {selectedSession && <DesktopSessionDetail session={selectedSession} weightUnit={weightUnit} />}
                        </div>
                    </div>

                    <div className="space-y-6 xl:hidden">
                        {groupedSessions.map(([monthKey, monthSessions]) => (
                            <div key={monthKey}>
                                <div className="mb-2 flex items-center justify-between px-1">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                        {formatMonth(monthSessions[0].performedDate)}
                                    </p>
                                    <span className="text-[11px] text-muted-foreground">{monthSessions.length}</span>
                                </div>

                                <div className="space-y-2">
                                    {monthSessions.map((session) => (
                                        <details key={session.sessionId} className="group overflow-hidden rounded-2xl border border-border bg-card">
                                            <summary className="cursor-pointer list-none p-3.5 [&::-webkit-details-marker]:hidden">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-card-foreground">{session.dayLabel}</p>
                                                        <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">{formatDate(session.performedDate)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <StatusBadge status={session.completionStatus} />
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" aria-hidden="true" />
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <SessionMeta session={session} />
                                                </div>
                                            </summary>

                                            <div className="border-t border-border p-3.5">
                                                <SessionExerciseDetails session={session} weightUnit={weightUnit} />
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}
