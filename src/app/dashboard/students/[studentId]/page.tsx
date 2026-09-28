import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentRiskCard from './StudentRiskCard'
import { getStudentRisk } from './getStudentRisk'
import DeleteStudentButton from './DeleteStudentButton'
import StudentInvitationCard from './StudentInvitationCard'
import { getStudentAccessAccount } from './invite-actions'
import ProgramScheduleCard from './ProgramScheduleCard'
import StudentContactCard from './StudentContactCard'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

type PageProps = {
    params: Promise<{
        studentId: string
    }>
    searchParams?: Promise<{
        setup?: string
    }>
}

export default async function StudentProfilePage(props: PageProps) {
    const params = await props.params;
    const searchParams = await props.searchParams
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const studentId = params.studentId

    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

    if (!student) {
        return <div className="p-6">No se encontró el alumno.</div>
    }

    const [risk, routineAssignment, linkedProfile, feedbackResult, weeklyCheckinResult] = await Promise.all([
        getStudentRisk(studentId),
        supabase.from('student_routines').select('routine_id, program_started_on').eq('student_id', studentId).eq('status', 'active').maybeSingle(),
        getStudentAccessAccount(studentId),
        supabase
            .from('workout_feedback')
            .select('energy, difficulty, had_pain, pain_details, comment, created_at')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from('student_weekly_checkins')
            .select('energy, sleep_quality, stress, training_difficulty, had_pain, pain_details, body_weight, waist_cm, comment, week_start')
            .eq('student_id', studentId)
            .order('week_start', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ])

    const assignedRoutineId = routineAssignment.data?.routine_id ?? null
    const programStartedOn = routineAssignment.data?.program_started_on ?? null

    let activeRoutineName: string | null = null
    let currentWeekLabel = 'Semana 1'
    let programWeekNumber = 1
    let totalProgramWeeks = 1
    let programReady = false

    if (assignedRoutineId && programStartedOn) {
        const [routineResult, schedule, daysResult] = await Promise.all([
            supabase
                .from('routines')
                .select('name')
                .eq('id', assignedRoutineId)
                .eq('trainer_id', user.id)
                .maybeSingle(),
            getRoutineSchedule(supabase, assignedRoutineId, { programStartedOn }),
            supabase
                .from('routine_days')
                .select('id')
                .eq('routine_id', assignedRoutineId),
        ])

        activeRoutineName = routineResult.data?.name ?? 'Rutina asignada'
        currentWeekLabel = schedule.currentWeek?.name
            || (schedule.currentWeek ? `Semana ${schedule.currentWeek.week_number}` : 'Semana actual')
        programWeekNumber = schedule.programWeekNumber || 1
        totalProgramWeeks = schedule.totalProgramWeeks || 1

        const dayIds = (daysResult.data ?? []).map((day) => day.id)
        if (dayIds.length > 0) {
            const { data: firstExercise } = await supabase
                .from('routine_day_exercises')
                .select('id')
                .in('routine_day_id', dayIds)
                .limit(1)
                .maybeSingle()
            programReady = Boolean(firstExercise)
        }
    }

    const trainHref = `/dashboard/students/${params.studentId}/train`

    const fullName =
        `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

    return (
        <div className="mx-auto max-w-3xl space-y-3 p-4 pb-44 md:p-6">
            <DashboardPageHeader
                title={fullName}
                subtitle="Perfil del alumno"
                backHref="/dashboard/students"
            />

            {assignedRoutineId && programStartedOn && activeRoutineName && (
                <ProgramScheduleCard
                    studentId={studentId}
                    routineName={activeRoutineName}
                    programStartedOn={programStartedOn}
                    currentWeekLabel={currentWeekLabel}
                    programWeekNumber={programWeekNumber}
                    totalProgramWeeks={totalProgramWeeks}
                />
            )}

            <StudentContactCard
                studentId={studentId}
                phone={student.phone ?? null}
            />

            {weeklyCheckinResult.data && (
                <section className={`rounded-2xl border p-4 ${weeklyCheckinResult.data.had_pain ? 'border-amber-500/30 bg-amber-500/[0.07]' : 'border-border bg-card'}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Check-in semanal</p>
                            <h2 className="mt-1 text-sm font-bold text-foreground">
                                {weeklyCheckinResult.data.had_pain ? '⚠️ Requiere atención' : 'Estado general del alumno'}
                            </h2>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                            Semana del {formatCheckinDate(weeklyCheckinResult.data.week_start)}
                        </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                        <CheckinMetric label="Energía" value={weeklyCheckinResult.data.energy} />
                        <CheckinMetric label="Sueño" value={weeklyCheckinResult.data.sleep_quality} />
                        <CheckinMetric label="Estrés" value={weeklyCheckinResult.data.stress} inverse />
                        <CheckinMetric label="Exigencia" value={weeklyCheckinResult.data.training_difficulty} inverse />
                    </div>
                    {(weeklyCheckinResult.data.body_weight != null || weeklyCheckinResult.data.waist_cm != null) && (
                        <p className="mt-3 text-[11px] text-muted-foreground">
                            {weeklyCheckinResult.data.body_weight != null ? `Peso ${weeklyCheckinResult.data.body_weight} kg` : ''}
                            {weeklyCheckinResult.data.body_weight != null && weeklyCheckinResult.data.waist_cm != null ? ' · ' : ''}
                            {weeklyCheckinResult.data.waist_cm != null ? `Cintura ${weeklyCheckinResult.data.waist_cm} cm` : ''}
                        </p>
                    )}
                    {(weeklyCheckinResult.data.pain_details || weeklyCheckinResult.data.comment) && (
                        <p className={`mt-3 text-xs leading-5 ${weeklyCheckinResult.data.had_pain ? 'font-medium text-amber-500' : 'text-muted-foreground'}`}>
                            {weeklyCheckinResult.data.pain_details || weeklyCheckinResult.data.comment}
                        </p>
                    )}
                </section>
            )}

            {feedbackResult.data && (
                <section className={`rounded-2xl border p-4 ${feedbackResult.data.had_pain ? 'border-amber-500/30 bg-amber-500/[0.07]' : 'border-border bg-card'}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Último control</p>
                            <h2 className="mt-1 text-sm font-bold text-foreground">
                                {feedbackResult.data.had_pain ? '⚠️ Informó una molestia' : 'Evaluación del entrenamiento'}
                            </h2>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                            {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(feedbackResult.data.created_at))}
                        </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-background/60 px-3 py-2"><span className="text-muted-foreground">Energía</span><strong className="ml-2 text-foreground">{feedbackResult.data.energy ?? '—'}/5</strong></div>
                        <div className="rounded-xl bg-background/60 px-3 py-2"><span className="text-muted-foreground">Dificultad</span><strong className="ml-2 text-foreground">{feedbackResult.data.difficulty ?? '—'}/5</strong></div>
                    </div>
                    {(feedbackResult.data.pain_details || feedbackResult.data.comment) && (
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">{feedbackResult.data.pain_details || feedbackResult.data.comment}</p>
                    )}
                </section>
            )}

            <StudentInvitationCard
                studentId={studentId}
                defaultEmail={student.email ?? null}
                linkedEmail={linkedProfile?.email ?? null}
                hasRoutine={Boolean(assignedRoutineId)}
                programReady={programReady}
                highlight={searchParams?.setup === 'invite'}
            />

            <StudentRiskCard risk={risk} />

            <details className="rounded-xl border border-border bg-card px-3.5 py-3 text-sm">
                <summary className="cursor-pointer font-semibold text-muted-foreground">Más opciones</summary>
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                    <DeleteStudentButton studentId={params.studentId} />
                </div>
            </details>

            <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur md:bottom-0">
                <div className="mx-auto grid max-w-xl grid-cols-2 gap-2 px-4 py-3">
                    <Link
                        href={`/dashboard/messages?student=${studentId}`}
                        className="col-span-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-center text-xs font-semibold text-violet-400 transition hover:bg-violet-500/20"
                    >
                        💬 Mensajes y seguimiento
                    </Link>
                    {assignedRoutineId ? (
                        <Link
                            href={`/dashboard/routines/${assignedRoutineId}`}
                            className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                        >
                            Ver rutina
                        </Link>
                    ) : (
                        <Link
                            href={`/dashboard/students/${params.studentId}/assign-routine`}
                            className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                        >
                            Asignar rutina
                        </Link>
                    )}
                    <Link
                        href={`/dashboard/students/${params.studentId}/progress`}
                        className="rounded-xl border border-indigo-300/40 bg-indigo-500/10 px-3 py-2.5 text-center text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20"
                    >
                        📊 Progreso
                    </Link>
                    <Link
                        href={trainHref}
                        className="rounded-xl bg-indigo-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-indigo-500"
                    >
                        Entrenar
                    </Link>
                    <Link
                        href={`/dashboard/students/${params.studentId}/history`}
                        className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                    >
                        Ver historial de sesiones
                    </Link>
                </div>
            </div>
        </div>
    )
}

function CheckinMetric({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
    const warning = inverse ? value >= 4 : value <= 2
    const positive = inverse ? value <= 2 : value >= 4
    return (
        <div className="rounded-xl bg-background/60 px-1 py-2">
            <p className={`text-sm font-black ${warning ? 'text-amber-500' : positive ? 'text-emerald-500' : 'text-foreground'}`}>{value}/5</p>
            <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{label}</p>
        </div>
    )
}

function formatCheckinDate(value: string) {
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
