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
import ProgressPhotoGallery, { type ProgressPhotoItem } from '@/components/coaching/ProgressPhotoGallery'
import StudentMonthlySummaryCard from './StudentMonthlySummaryCard'
import { getBuenosAiresDateString } from '@/lib/buenosAiresDate'
import {
    ONBOARDING_EQUIPMENT,
    ONBOARDING_EXPERIENCE,
    ONBOARDING_GOALS,
    ONBOARDING_LOCATIONS,
    type StudentOnboardingProfile,
} from '@/lib/studentOnboarding'

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
    const today = getBuenosAiresDateString()
    const currentPeriodStart = shiftDate(today, -27)
    const previousPeriodStart = shiftDate(today, -55)
    const previousPeriodEnd = shiftDate(today, -28)

    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .eq('trainer_id', user.id)
        .single()

    if (!student) {
        return <div className="p-6">No se encontró el alumno.</div>
    }

    const [risk, routineAssignment, linkedProfile, feedbackResult, weeklyCheckinsResult, progressPhotosResult, sessionsResult, onboardingResult] = await Promise.all([
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
            .limit(8),
        supabase
            .from('student_progress_photos')
            .select('id, storage_path, captured_on, pose, marketing_consent')
            .eq('student_id', studentId)
            .order('captured_on', { ascending: true })
            .limit(30),
        supabase
            .from('workout_sessions')
            .select('performed_date')
            .eq('student_id', studentId)
            .eq('status', 'completed')
            .eq('completed_manually', true)
            .gte('performed_date', previousPeriodStart)
            .lte('performed_date', today),
        supabase
            .from('student_onboarding_profiles')
            .select('student_id, goals, experience_level, training_days_per_week, session_minutes, training_location, available_equipment, limitations, preferences, completed_at')
            .eq('student_id', studentId)
            .maybeSingle(),
    ])

    const onboarding = (onboardingResult.data as StudentOnboardingProfile | null) ?? null
    const onboardingCompleted = Boolean(onboarding?.completed_at)

    const progressPhotos = (await Promise.all((progressPhotosResult.data ?? []).map(async (photo) => {
        const { data: signed } = await supabase.storage
            .from('progress-photos')
            .createSignedUrl(photo.storage_path, 3600)
        if (!signed?.signedUrl) return null
        return {
            id: photo.id,
            url: signed.signedUrl,
            capturedOn: photo.captured_on,
            pose: photo.pose,
            marketingConsent: photo.marketing_consent,
        } as ProgressPhotoItem
    }))).filter((photo): photo is ProgressPhotoItem => photo !== null)

    const weeklyCheckins = weeklyCheckinsResult.data ?? []
    const latestWeeklyCheckin = weeklyCheckins[0] ?? null
    const currentCheckins = weeklyCheckins.filter((checkin) => checkin.week_start >= currentPeriodStart)
    const sessions = sessionsResult.data ?? []
    const currentSessions = sessions.filter((session) => session.performed_date >= currentPeriodStart).length
    const previousSessions = sessions.filter((session) => (
        session.performed_date >= previousPeriodStart && session.performed_date <= previousPeriodEnd
    )).length
    const weightChange = getMeasurementChange(currentCheckins, 'body_weight')
    const waistChange = getMeasurementChange(currentCheckins, 'waist_cm')

    const assignedRoutineId = routineAssignment.data?.routine_id ?? null
    const programStartedOn = routineAssignment.data?.program_started_on ?? null

    let activeRoutineName: string | null = null
    let currentWeekLabel = 'Semana 1'
    let programWeekNumber = 1
    let totalProgramWeeks = 1

    if (assignedRoutineId && programStartedOn) {
        const [routineResult, schedule] = await Promise.all([
            supabase
                .from('routines')
                .select('name')
                .eq('id', assignedRoutineId)
                .eq('trainer_id', user.id)
                .maybeSingle(),
            getRoutineSchedule(supabase, assignedRoutineId, { programStartedOn }),
        ])

        activeRoutineName = routineResult.data?.name ?? 'Rutina asignada'
        currentWeekLabel = schedule.currentWeek?.name
            || (schedule.currentWeek ? `Semana ${schedule.currentWeek.week_number}` : 'Semana actual')
        programWeekNumber = schedule.programWeekNumber || 1
        totalProgramWeeks = schedule.totalProgramWeeks || 1
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

            {!linkedProfile && (
                <StudentInvitationCard
                    studentId={studentId}
                    defaultEmail={student.email ?? null}
                    linkedEmail={null}
                    highlight={searchParams?.setup === 'invite'}
                />
            )}

            {onboardingCompleted && onboarding ? (
                <section className="rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.06] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Ficha inicial</p>
                            <h2 className="mt-1 text-sm font-black text-foreground">Objetivos y disponibilidad</h2>
                        </div>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-400">Completada</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {onboarding.goals.map((goal) => (
                            <span key={goal} className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-300">
                                {labelFor(ONBOARDING_GOALS, goal)}
                            </span>
                        ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        <OnboardingMetric label="Experiencia" value={labelFor(ONBOARDING_EXPERIENCE, onboarding.experience_level)} />
                        <OnboardingMetric label="Disponibilidad" value={`${onboarding.training_days_per_week} días · ${onboarding.session_minutes} min`} />
                        <OnboardingMetric label="Lugar" value={labelFor(ONBOARDING_LOCATIONS, onboarding.training_location)} />
                        <OnboardingMetric
                            label="Equipamiento"
                            value={onboarding.available_equipment.length
                                ? onboarding.available_equipment.map((item) => labelFor(ONBOARDING_EQUIPMENT, item)).join(', ')
                                : 'Sin especificar'}
                        />
                    </div>
                    {(onboarding.limitations || onboarding.preferences) && (
                        <div className="mt-3 space-y-2 border-t border-indigo-500/15 pt-3 text-xs leading-5">
                            {onboarding.limitations && (
                                <p><span className="font-bold text-amber-400">Cuidados: </span><span className="text-muted-foreground">{onboarding.limitations}</span></p>
                            )}
                            {onboarding.preferences && (
                                <p><span className="font-bold text-foreground">Preferencias: </span><span className="text-muted-foreground">{onboarding.preferences}</span></p>
                            )}
                        </div>
                    )}
                </section>
            ) : linkedProfile ? (
                <section className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3.5 py-3">
                    <p className="text-xs font-bold text-amber-400">Ficha inicial pendiente</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">El alumno todavía no completó sus objetivos y disponibilidad.</p>
                </section>
            ) : null}

            <StudentMonthlySummaryCard
                studentId={studentId}
                studentName={fullName}
                studentPhone={student.phone ?? null}
                sessions={currentSessions}
                previousSessions={previousSessions}
                checkins={currentCheckins.length}
                weightChange={weightChange}
                waistChange={waistChange}
                painReports={currentCheckins.filter((checkin) => checkin.had_pain).length}
            />

            {latestWeeklyCheckin && (
                <section className={`rounded-2xl border p-4 ${latestWeeklyCheckin.had_pain ? 'border-amber-500/30 bg-amber-500/[0.07]' : 'border-border bg-card'}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Check-in semanal</p>
                            <h2 className="mt-1 text-sm font-bold text-foreground">
                                {latestWeeklyCheckin.had_pain ? '⚠️ Requiere atención' : 'Estado general del alumno'}
                            </h2>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                            Semana del {formatCheckinDate(latestWeeklyCheckin.week_start)}
                        </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                        <CheckinMetric label="Energía" value={latestWeeklyCheckin.energy} />
                        <CheckinMetric label="Sueño" value={latestWeeklyCheckin.sleep_quality} />
                        <CheckinMetric label="Estrés" value={latestWeeklyCheckin.stress} inverse />
                        <CheckinMetric label="Exigencia" value={latestWeeklyCheckin.training_difficulty} inverse />
                    </div>
                    {(latestWeeklyCheckin.body_weight != null || latestWeeklyCheckin.waist_cm != null) && (
                        <p className="mt-3 text-[11px] text-muted-foreground">
                            {latestWeeklyCheckin.body_weight != null ? `Peso ${latestWeeklyCheckin.body_weight} kg` : ''}
                            {latestWeeklyCheckin.body_weight != null && latestWeeklyCheckin.waist_cm != null ? ' · ' : ''}
                            {latestWeeklyCheckin.waist_cm != null ? `Cintura ${latestWeeklyCheckin.waist_cm} cm` : ''}
                        </p>
                    )}
                    {(latestWeeklyCheckin.pain_details || latestWeeklyCheckin.comment) && (
                        <p className={`mt-3 text-xs leading-5 ${latestWeeklyCheckin.had_pain ? 'font-medium text-amber-500' : 'text-muted-foreground'}`}>
                            {latestWeeklyCheckin.pain_details || latestWeeklyCheckin.comment}
                        </p>
                    )}
                </section>
            )}

            <ProgressPhotoGallery photos={progressPhotos} role="trainer" />

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

            {linkedProfile && (
                <StudentInvitationCard
                    studentId={studentId}
                    defaultEmail={student.email ?? null}
                    linkedEmail={linkedProfile.email ?? null}
                    highlight={searchParams?.setup === 'invite'}
                />
            )}

            <StudentRiskCard risk={risk} />

            <details className="rounded-xl border border-border bg-card px-3.5 py-3 text-sm">
                <summary className="cursor-pointer font-semibold text-muted-foreground">Más opciones</summary>
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {!assignedRoutineId && !onboardingCompleted && (
                        <Link
                            href={`/dashboard/students/${studentId}/assign-routine`}
                            className="block rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-xs font-semibold text-secondary-foreground"
                        >
                            Asignar programa igualmente
                        </Link>
                    )}
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
                    ) : onboardingCompleted ? (
                        <Link
                            href={`/dashboard/students/${params.studentId}/assign-routine`}
                            className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                        >
                            Elegir programa
                        </Link>
                    ) : !linkedProfile ? (
                        <a
                            href="#student-access"
                            className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-center text-xs font-semibold text-emerald-400"
                        >
                            Enviar acceso
                        </a>
                    ) : (
                        <span className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-center text-xs font-semibold text-amber-400">
                            Esperando ficha
                        </span>
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

function OnboardingMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-background/60 px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 font-bold leading-4 text-foreground">{value}</p>
        </div>
    )
}

function labelFor(labels: Record<string, string>, value: string) {
    return labels[value] ?? value
}

function formatCheckinDate(value: string) {
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function shiftDate(value: string, days: number) {
    const date = new Date(`${value}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
}

function getMeasurementChange(
    rows: { body_weight: number | null; waist_cm: number | null }[],
    key: 'body_weight' | 'waist_cm'
) {
    const values = rows
        .map((row) => row[key])
        .filter((value): value is number => value !== null)

    if (values.length < 2) return null
    return Math.round((values[0] - values[values.length - 1]) * 10) / 10
}
