import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentSessionHistoryResult } from '@/app/dashboard/students/getStudentSessionHistory'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import type { WeightUnit } from '@/lib/weight'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import { getServerUser } from '@/lib/auth/server'
import TrainerStudentHistory from './TrainerStudentHistory'

type PageProps = {
    params: Promise<{ studentId: string }>
}

const HISTORY_LIMIT = 50

export default async function StudentHistoryPage(props: PageProps) {
    const params = await props.params
    const supabase = await createClient()
    const user = await getServerUser()
    if (!user) redirect('/login')

    // Validar primero que el alumno pertenezca al entrenador. Así no se
    // consulta ningún historial antes de confirmar la relación.
    const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', params.studentId)
        .eq('trainer_id', user.id)
        .single()

    if (!student) redirect('/dashboard/students')

    const [historyResult, trainerProfile] = await Promise.all([
        getStudentSessionHistoryResult(params.studentId, HISTORY_LIMIT),
        getTrainerProfile(),
    ])

    const sessions = historyResult.sessions
    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit
    const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
    const completedSessions = sessions.filter((session) => session.completionStatus === 'complete')
    const partialSessions = sessions.length - completedSessions.length
    const totalSets = sessions.reduce((total, session) => total + session.totalSets, 0)
    const sessionsWithDuration = completedSessions.filter(
        (session) => session.durationSeconds !== null && session.durationSeconds > 0
    )
    const avgDuration = sessionsWithDuration.length > 0
        ? Math.round(
            sessionsWithDuration.reduce(
                (total, session) => total + (session.durationSeconds ?? 0),
                0
            ) / sessionsWithDuration.length / 60
        )
        : null

    const subtitle = sessions.length === 0
        ? fullName
        : `${fullName} · ${sessions.length} ${sessions.length === 1 ? 'sesión visible' : 'sesiones visibles'}`

    return (
        <div className="p-4 pb-24 md:p-6 xl:px-8 xl:pb-8">
            <div className="mx-auto w-full max-w-[1500px] space-y-4">
                <DashboardPageHeader
                    title="Historial"
                    subtitle={subtitle}
                    backHref={`/dashboard/students/${params.studentId}`}
                />

                {sessions.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-border bg-card p-3">
                            <p className="text-[11px] font-medium text-muted-foreground">Sesiones visibles</p>
                            <p className="mt-1 text-2xl font-black text-primary">{sessions.length}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {sessions.length === HISTORY_LIMIT ? `Últimas ${HISTORY_LIMIT}` : 'Historial disponible'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3">
                            <p className="text-[11px] font-medium text-muted-foreground">Estado</p>
                            <p className="mt-1 text-2xl font-black text-emerald-500">{completedSessions.length}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Completas{partialSessions > 0 ? ` · ${partialSessions} parciales` : ''}
                            </p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3">
                            <p className="text-[11px] font-medium text-muted-foreground">Series registradas</p>
                            <p className="mt-1 text-2xl font-black text-card-foreground">{totalSets}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">En las sesiones visibles</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3">
                            <p className="text-[11px] font-medium text-muted-foreground">Duración media</p>
                            <p className="mt-1 text-2xl font-black text-amber-500">
                                {avgDuration !== null ? `${avgDuration}m` : '—'}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">Solo sesiones completas</p>
                        </div>
                    </div>
                )}

                {historyResult.error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-8 text-center">
                        <p className="text-sm font-semibold text-card-foreground">
                            No pudimos cargar el historial
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{historyResult.error}</p>
                        <Link
                            href={`/dashboard/students/${params.studentId}/history`}
                            className="mt-4 inline-flex rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:bg-muted"
                        >
                            Reintentar
                        </Link>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                        <p className="text-4xl">🏋️</p>
                        <p className="mt-3 text-sm font-semibold text-card-foreground">
                            Todavía no hay sesiones registradas
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Acá aparecerán las sesiones completas y parciales que tengan series guardadas.
                        </p>
                        <Link
                            href={`/dashboard/students/${params.studentId}`}
                            className="mt-4 inline-flex rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:bg-muted"
                        >
                            Volver al perfil
                        </Link>
                    </div>
                ) : (
                    <TrainerStudentHistory
                        sessions={sessions}
                        weightUnit={weightUnit}
                        visibleLimit={HISTORY_LIMIT}
                    />
                )}
            </div>
        </div>
    )
}
