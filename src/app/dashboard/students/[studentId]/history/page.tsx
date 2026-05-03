import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentSessionHistory } from '../getStudentSessionHistory'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'

type PageProps = {
    params: { studentId: string }
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    })
}

function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    if (secs === 0) return `${mins}m`
    return `${mins}m ${secs}s`
}

function groupByMonth(sessions: Awaited<ReturnType<typeof getStudentSessionHistory>>) {
    const groups = new Map<string, typeof sessions>()

    for (const session of sessions) {
        const date = new Date(session.performedDate + 'T00:00:00')
        const key = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(session)
    }

    return groups
}

export default async function StudentHistoryPage({ params }: PageProps) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [studentResult, sessions, trainerProfile] = await Promise.all([
        supabase
            .from('students')
            .select('first_name, last_name')
            .eq('id', params.studentId)
            .eq('trainer_id', user.id)
            .single(),
        getStudentSessionHistory(params.studentId, 50),
        getTrainerProfile(),
    ])

    const student = studentResult.data
    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit
    const fullName = `${student?.first_name ?? ''} ${student?.last_name ?? ''}`.trim()

    const grouped = groupByMonth(sessions)

    const totalSessions = sessions.length
    const totalSets = sessions.reduce((acc, s) => acc + s.totalSets, 0)
    const avgDuration = sessions.filter(s => s.durationSeconds).length > 0
        ? Math.round(
            sessions
                .filter(s => s.durationSeconds)
                .reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0) /
            sessions.filter(s => s.durationSeconds).length / 60
        )
        : null

    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-2xl">

                {/* ── Header ── */}
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                        <Link
                            href={`/dashboard/students/${params.studentId}`}
                            className="text-xs text-muted-foreground transition hover:text-foreground"
                        >
                            ← {fullName}
                        </Link>
                        <h1 className="mt-1 text-2xl font-black text-foreground">
                            Historial
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Sesiones completadas
                        </p>
                    </div>

                    {totalSessions > 0 && (
                        <div className="text-right">
                            <p className="text-3xl font-black text-indigo-500">
                                {totalSessions}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {totalSessions === 1 ? 'sesión' : 'sesiones'}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Stats row ── */}
                {totalSessions > 0 && (
                    <div className="mb-5 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-border bg-card p-3 text-center">
                            <p className="text-xl font-black text-indigo-400">{totalSessions}</p>
                            <p className="text-[10px] text-muted-foreground">Sesiones</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-3 text-center">
                            <p className="text-xl font-black text-emerald-400">{totalSets}</p>
                            <p className="text-[10px] text-muted-foreground">Series totales</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-3 text-center">
                            <p className="text-xl font-black text-amber-400">
                                {avgDuration ? `${avgDuration}m` : '—'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Duración media</p>
                        </div>
                    </div>
                )}

                {/* ── Sin datos ── */}
                {totalSessions === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                        <p className="text-4xl">🏋️</p>
                        <p className="mt-3 text-sm font-semibold text-card-foreground">
                            Todavía no hay sesiones completadas
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Las sesiones aparecen acá después de finalizarlas en Entrenar.
                        </p>
                        <Link
                            href={`/dashboard/students/${params.studentId}/train`}
                            className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                        >
                            Ir a entrenar
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {[...grouped.entries()].map(([monthLabel, monthSessions]) => (
                            <div key={monthLabel}>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {monthLabel}
                                </p>

                                <div className="space-y-2.5">
                                    {monthSessions.map((session) => (
                                        <div
                                            key={session.sessionId}
                                            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-card-foreground">
                                                        {session.dayLabel}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {formatDate(session.performedDate)}
                                                    </p>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-2">
                                                    {session.durationSeconds && (
                                                        <span className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-medium text-secondary-foreground">
                                                            ⏱ {formatDuration(session.durationSeconds)}
                                                        </span>
                                                    )}
                                                    <span className="rounded-lg bg-indigo-500/10 px-2 py-1 text-[10px] font-semibold text-indigo-500">
                                                        {session.totalSets} series
                                                    </span>
                                                </div>
                                            </div>

                                            {session.exercises.length > 0 && (
                                                <div className="mt-3 space-y-1.5">
                                                    {session.exercises.map((ex, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate text-xs font-medium text-card-foreground">
                                                                    {ex.exerciseName}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    {ex.sets} {ex.sets === 1 ? 'serie' : 'series'}
                                                                </p>
                                                            </div>

                                                            <div className="shrink-0 text-right">
                                                                {ex.isCardio ? (
                                                                    ex.bestReps !== null && (
                                                                        <p className="text-xs font-bold text-card-foreground">
                                                                            {ex.bestReps} min
                                                                        </p>
                                                                    )
                                                                ) : (
                                                                    ex.bestWeight !== null && (
                                                                        <p className="text-xs font-bold text-emerald-500">
                                                                            {formatWeight(ex.bestWeight, weightUnit)}
                                                                        </p>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
