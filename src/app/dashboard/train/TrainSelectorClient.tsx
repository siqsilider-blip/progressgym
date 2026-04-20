'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ClipboardList, Play, Search, X, Zap } from 'lucide-react'

type TrainStudentItem = {
    id: string
    fullName: string
    activePlan: string | null
    routineName: string | null
    daysPerWeek: number | null
    hasRoutine: boolean
    lastWorkoutAt?: string | null
    riskLevel: 'low' | 'medium' | 'high'
}

type PriorityBucket = 'today' | 'active' | 'follow_up' | 'risk' | 'never'

function getDiffDays(date?: string | null) {
    if (!date) return null
    const now = new Date()
    const last = new Date(date)
    const diffMs = now.getTime() - last.getTime()
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function getLastWorkoutLabel(date?: string | null) {
    const diffDays = getDiffDays(date)
    if (diffDays === null) return 'Nunca entrenó'
    if (diffDays === 0) return 'Entrena hoy'
    if (diffDays === 1) return 'Entrenó ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        return `Hace ${weeks} semana${weeks === 1 ? '' : 's'}`
    }
    const months = Math.floor(diffDays / 30)
    return `Hace ${months} mes${months === 1 ? '' : 'es'}`
}

function getPriorityBucket(student: TrainStudentItem): PriorityBucket {
    const diffDays = getDiffDays(student.lastWorkoutAt)
    if (student.riskLevel === 'high') return 'risk'
    if (student.riskLevel === 'medium') return 'follow_up'
    if (diffDays === null) return 'never'
    if (diffDays === 0) return 'today'
    return 'active'
}

function getPriorityOrder(bucket: PriorityBucket) {
    switch (bucket) {
        case 'today': return 0
        case 'active': return 1
        case 'follow_up': return 2
        case 'risk': return 3
        case 'never': return 4
        default: return 5
    }
}

function getStatusBadge(student: TrainStudentItem) {
    const bucket = getPriorityBucket(student)
    switch (bucket) {
        case 'today': return { label: 'Hoy', className: 'bg-emerald-500/10 text-emerald-500' }
        case 'active': return { label: 'Activo', className: 'bg-cyan-500/10 text-cyan-500' }
        case 'follow_up': return { label: 'Atención', className: 'bg-amber-500/10 text-amber-500' }
        case 'risk': return { label: 'Riesgo', className: 'bg-red-500/10 text-red-400' }
        case 'never': return { label: 'Sin historial', className: 'bg-zinc-500/10 text-zinc-400' }
    }
}

function StudentCard({
    student,
    ctaLabel,
    href,
    variant = 'train',
}: {
    student: TrainStudentItem
    ctaLabel: string
    href: string
    variant?: 'train' | 'routine'
}) {
    const badge = getStatusBadge(student)
    const subtitle =
        variant === 'train'
            ? `${student.routineName || 'Sin rutina'} · ${getLastWorkoutLabel(student.lastWorkoutAt)}`
            : 'Sin rutina asignada'

    return (
        <Link
            href={href}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 transition hover:bg-muted/40"
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-card-foreground">
                        {student.fullName}
                    </p>
                    {variant === 'train' && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                            {badge.label}
                        </span>
                    )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            </div>

            <div className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${
                variant === 'train'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-border bg-secondary text-secondary-foreground'
            }`}>
                <div className="flex items-center gap-1.5">
                    {variant === 'train'
                        ? <Zap className="h-3.5 w-3.5" />
                        : <ClipboardList className="h-3.5 w-3.5" />
                    }
                    {ctaLabel}
                </div>
            </div>
        </Link>
    )
}

export default function TrainSelectorClient({
    students,
}: {
    students: TrainStudentItem[]
}) {
    const [query, setQuery] = useState('')
    const normalizedQuery = query.trim().toLowerCase()

    const filteredStudents = useMemo(() => {
        const base = !normalizedQuery
            ? students
            : students.filter((student) => {
                const searchableText = [
                    student.fullName,
                    student.activePlan ?? '',
                    student.routineName ?? '',
                ]
                    .join(' ')
                    .toLowerCase()
                return searchableText.includes(normalizedQuery)
            })

        return [...base].sort((a, b) => {
            const orderDiff =
                getPriorityOrder(getPriorityBucket(a)) -
                getPriorityOrder(getPriorityBucket(b))
            if (orderDiff !== 0) return orderDiff
            const dateA = a.lastWorkoutAt ? new Date(a.lastWorkoutAt).getTime() : 0
            const dateB = b.lastWorkoutAt ? new Date(b.lastWorkoutAt).getTime() : 0
            return dateB - dateA
        })
    }, [students, normalizedQuery])

    const studentsWithRoutine = filteredStudents.filter((s) => s.hasRoutine)
    const studentsWithoutRoutine = filteredStudents.filter((s) => !s.hasRoutine)

    const featuredStudent =
        studentsWithRoutine.find((s) => getPriorityBucket(s) === 'today') ||
        studentsWithRoutine.find((s) => getPriorityBucket(s) === 'active') ||
        studentsWithRoutine.find((s) => getPriorityBucket(s) === 'follow_up') ||
        studentsWithRoutine.find((s) => getPriorityBucket(s) === 'risk') ||
        studentsWithRoutine[0] ||
        null

    const studentsWithoutFeatured = studentsWithRoutine.filter(
        (s) => s.id !== featuredStudent?.id
    )

    const bucketedStudents = {
        today: studentsWithoutFeatured.filter((s) => getPriorityBucket(s) === 'today'),
        active: studentsWithoutFeatured.filter((s) => getPriorityBucket(s) === 'active'),
        follow_up: studentsWithoutFeatured.filter((s) => getPriorityBucket(s) === 'follow_up'),
        risk: studentsWithoutFeatured.filter((s) => getPriorityBucket(s) === 'risk'),
        never: studentsWithoutFeatured.filter((s) => getPriorityBucket(s) === 'never'),
    }

    const bucketConfig: {
        key: PriorityBucket
        label: string
        countClass: string
    }[] = [
        { key: 'today', label: 'Hoy', countClass: 'bg-emerald-500/10 text-emerald-500' },
        { key: 'active', label: 'Activos', countClass: 'bg-cyan-500/10 text-cyan-500' },
        { key: 'follow_up', label: 'Atención', countClass: 'bg-amber-500/10 text-amber-500' },
        { key: 'risk', label: 'Riesgo', countClass: 'bg-red-500/10 text-red-400' },
        { key: 'never', label: 'Sin historial', countClass: 'bg-zinc-500/10 text-zinc-400' },
    ]

    return (
        <div className="space-y-4 p-4 pb-24 md:p-6">
            <div className="space-y-1 pt-1">
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                    Elegir alumno
                </h1>
                <p className="text-sm text-muted-foreground">Quién entrenás ahora.</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar alumno..."
                        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {!!normalizedQuery && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-sm text-muted-foreground">
                        Resultados para{' '}
                        <span className="font-medium text-foreground">"{query}"</span>
                    </p>
                    <span className="text-xs font-semibold text-muted-foreground">
                        {filteredStudents.length}
                    </span>
                </div>
            )}

            {!normalizedQuery && featuredStudent && (
                <section className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Continuar
                    </p>
                    <Link
                        href={`/dashboard/students/${featuredStudent.id}/train`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 transition hover:bg-muted/40"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-card-foreground">
                                {featuredStudent.fullName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {featuredStudent.routineName || 'Sin rutina'} ·{' '}
                                {getLastWorkoutLabel(featuredStudent.lastWorkoutAt)}
                            </p>
                        </div>
                        <div className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                            <div className="flex items-center gap-1.5">
                                <Play className="h-3.5 w-3.5" />
                                Entrenar
                            </div>
                        </div>
                    </Link>
                </section>
            )}

            {bucketConfig.map(({ key, label, countClass }) =>
                bucketedStudents[key].length > 0 ? (
                    <section key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                {label}
                            </h2>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${countClass}`}>
                                {bucketedStudents[key].length}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {bucketedStudents[key].map((student) => (
                                <StudentCard
                                    key={student.id}
                                    student={student}
                                    href={`/dashboard/students/${student.id}/train`}
                                    ctaLabel="Entrenar"
                                    variant="train"
                                />
                            ))}
                        </div>
                    </section>
                ) : null
            )}

            {studentsWithoutRoutine.length > 0 && (
                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Sin rutina
                        </h2>
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-500">
                            {studentsWithoutRoutine.length}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {studentsWithoutRoutine.map((student) => (
                            <StudentCard
                                key={student.id}
                                student={student}
                                href={`/dashboard/routines?studentId=${student.id}`}
                                ctaLabel="Crear rutina"
                                variant="routine"
                            />
                        ))}
                    </div>
                </section>
            )}

            {filteredStudents.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm font-medium text-card-foreground">
                        No encontramos alumnos
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Probá con otro nombre, plan o rutina.
                    </p>
                </div>
            )}
        </div>
    )
}
