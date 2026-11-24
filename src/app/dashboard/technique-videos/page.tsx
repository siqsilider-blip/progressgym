import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    MessageCircle,
    UserRound,
    Video,
} from 'lucide-react'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'
import { getServerUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import ReviewTechniqueVideoForm from './ReviewTechniqueVideoForm'

type PageProps = {
    searchParams?: Promise<{ status?: string }>
}

type TechniqueVideoRow = {
    id: string
    trainer_id: string
    student_id: string
    workout_session_id: string
    routine_day_exercise_id: string
    storage_path: string
    duration_seconds: number | null
    file_size_bytes: number | null
    note: string | null
    status: 'pending' | 'reviewed'
    trainer_feedback: string | null
    created_at: string
    reviewed_at: string | null
    expires_at: string | null
}

type StudentRow = {
    id: string
    first_name: string
    last_name: string
}

type RoutineExerciseRow = {
    id: string
    exercise_id: string | null
}

type ExerciseRow = {
    id: string
    name: string
}

export default async function TechniqueVideosPage(props: PageProps) {
    const searchParams = await props.searchParams
    const user = await getServerUser()
    if (!user) redirect('/login')

    const requestedStatus = searchParams?.status
    const status = requestedStatus === 'reviewed' || requestedStatus === 'all'
        ? requestedStatus
        : 'pending'
    const activeAt = new Date().toISOString()

    const supabase = await createClient()
    const baseQuery = supabase
        .from('technique_video_submissions')
        .select('id, trainer_id, student_id, workout_session_id, routine_day_exercise_id, storage_path, duration_seconds, file_size_bytes, note, status, trainer_feedback, created_at, reviewed_at, expires_at')
        .eq('trainer_id', user.id)
        .gt('expires_at', activeAt)
        .order('created_at', { ascending: false })
        .limit(80)

    const submissionsQuery = status === 'all'
        ? baseQuery.in('status', ['pending', 'reviewed'])
        : baseQuery.eq('status', status)

    const [submissionsResult, pendingCountResult, reviewedCountResult] = await Promise.all([
        submissionsQuery,
        supabase
            .from('technique_video_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('trainer_id', user.id)
            .eq('status', 'pending')
            .gt('expires_at', activeAt),
        supabase
            .from('technique_video_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('trainer_id', user.id)
            .eq('status', 'reviewed')
            .gt('expires_at', activeAt),
    ])

    const loadError = submissionsResult.error
    const submissions = (submissionsResult.data as TechniqueVideoRow[] | null) ?? []

    const studentIds = [...new Set(submissions.map((item) => item.student_id))]
    const routineExerciseIds = [...new Set(submissions.map((item) => item.routine_day_exercise_id))]

    const [studentsResult, routineExercisesResult, signedUrlsResult] = await Promise.all([
        studentIds.length
            ? supabase
                .from('students')
                .select('id, first_name, last_name')
                .eq('trainer_id', user.id)
                .in('id', studentIds)
            : Promise.resolve({ data: [] as StudentRow[] }),
        routineExerciseIds.length
            ? supabase
                .from('routine_day_exercises')
                .select('id, exercise_id')
                .in('id', routineExerciseIds)
            : Promise.resolve({ data: [] as RoutineExerciseRow[] }),
        submissions.length
            ? supabase.storage
                .from('technique-videos')
                .createSignedUrls(submissions.map((item) => item.storage_path), 3600)
            : Promise.resolve({ data: [] as { path: string; signedUrl: string }[] }),
    ])

    const students = (studentsResult.data as StudentRow[] | null) ?? []
    const routineExercises = (routineExercisesResult.data as RoutineExerciseRow[] | null) ?? []
    const exerciseIds = [...new Set(routineExercises.map((item) => item.exercise_id).filter((id): id is string => Boolean(id)))]

    const { data: exercisesData } = exerciseIds.length
        ? await supabase
            .from('exercises')
            .select('id, name')
            .in('id', exerciseIds)
        : { data: [] }

    const studentById = new Map(students.map((student) => [student.id, student]))
    const exerciseIdByRoutineExercise = new Map(routineExercises.map((item) => [item.id, item.exercise_id]))
    const exerciseById = new Map(((exercisesData as ExerciseRow[] | null) ?? []).map((exercise) => [exercise.id, exercise]))
    const signedUrlByPath = new Map(
        (signedUrlsResult.data ?? [])
            .filter((item): item is { path: string; signedUrl: string } => Boolean(item.path && item.signedUrl))
            .map((item) => [item.path, item.signedUrl])
    )

    const pendingCount = pendingCountResult.count ?? 0
    const reviewedCount = reviewedCountResult.count ?? 0

    return (
        <TrainerPageShell className="space-y-4">
            <DashboardPageHeader
                title="Videos de técnica"
                subtitle="Revisá ejecuciones y devolvé indicaciones sin perder el contexto del ejercicio."
                backHref="/dashboard"
                action={pendingCount > 0 ? (
                    <span className="inline-flex min-h-9 items-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-black text-amber-300">
                        {pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'}
                    </span>
                ) : null}
            />

            <section className="grid grid-cols-2 gap-2 md:max-w-xl">
                <SummaryCard
                    label="Por revisar"
                    value={pendingCount}
                    icon={<Clock3 className="h-4 w-4" />}
                    accent="amber"
                />
                <SummaryCard
                    label="Revisados"
                    value={reviewedCount}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    accent="green"
                />
            </section>

            <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar videos">
                <FilterLink href="/dashboard/technique-videos" active={status === 'pending'}>
                    Pendientes ({pendingCount})
                </FilterLink>
                <FilterLink href="/dashboard/technique-videos?status=reviewed" active={status === 'reviewed'}>
                    Revisados ({reviewedCount})
                </FilterLink>
                <FilterLink href="/dashboard/technique-videos?status=all" active={status === 'all'}>
                    Todos
                </FilterLink>
            </nav>

            {loadError ? (
                <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-5">
                    <h2 className="text-sm font-black text-amber-200">La bandeja todavía no está disponible</h2>
                    <p className="mt-1 text-xs leading-5 text-amber-100/60">
                        Falta aplicar la migración de videos de técnica en Supabase.
                    </p>
                </section>
            ) : submissions.length === 0 ? (
                <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] px-5 py-12 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        {status === 'pending' ? <CheckCircle2 className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                    </span>
                    <h2 className="mt-4 text-base font-black text-white">
                        {status === 'pending' ? 'No tenés videos pendientes' : 'Todavía no hay videos en esta sección'}
                    </h2>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-white/35">
                        {status === 'pending'
                            ? 'Cuando una alumna envíe una ejecución, aparecerá acá con el ejercicio y la sesión correspondientes.'
                            : 'Los videos revisados quedarán disponibles durante su período de conservación.'}
                    </p>
                </section>
            ) : (
                <section className="space-y-4">
                    {submissions.map((submission) => {
                        const student = studentById.get(submission.student_id)
                        const studentName = student
                            ? `${student.first_name} ${student.last_name}`.trim()
                            : 'Alumna'
                        const exerciseId = exerciseIdByRoutineExercise.get(submission.routine_day_exercise_id)
                        const exerciseName = exerciseId
                            ? exerciseById.get(exerciseId)?.name ?? 'Ejercicio de la rutina'
                            : 'Ejercicio de la rutina'
                        const signedUrl = signedUrlByPath.get(submission.storage_path)

                        return (
                            <article
                                key={submission.id}
                                className={`overflow-hidden rounded-3xl border bg-white/[0.025] ${submission.status === 'pending'
                                    ? 'border-primary/20'
                                    : 'border-white/[0.07]'
                                    }`}
                            >
                                <div className="grid xl:grid-cols-[minmax(24rem,0.95fr)_minmax(22rem,1.05fr)]">
                                    <div className="border-b border-white/[0.06] bg-black/25 p-3 xl:border-b-0 xl:border-r xl:p-4">
                                        {signedUrl ? (
                                            <video
                                                controls
                                                controlsList="nodownload"
                                                playsInline
                                                preload="metadata"
                                                src={signedUrl}
                                                className="aspect-video w-full rounded-2xl bg-black object-contain"
                                            >
                                                Tu navegador no puede reproducir este video.
                                            </video>
                                        ) : (
                                            <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-black/40 text-center">
                                                <Video className="h-7 w-7 text-white/25" />
                                                <p className="mt-2 text-xs font-bold text-white/50">El video no está disponible</p>
                                                <p className="mt-1 text-[10px] text-white/25">Actualizá la página para generar un enlace nuevo.</p>
                                            </div>
                                        )}

                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-white/35">
                                            {submission.duration_seconds != null && (
                                                <span className="rounded-lg bg-white/[0.05] px-2 py-1">
                                                    {formatDuration(submission.duration_seconds)}
                                                </span>
                                            )}
                                            {submission.file_size_bytes != null && (
                                                <span className="rounded-lg bg-white/[0.05] px-2 py-1">
                                                    {formatFileSize(submission.file_size_bytes)}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.05] px-2 py-1">
                                                <CalendarDays className="h-3 w-3" />
                                                {formatDateTime(submission.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex min-w-0 flex-col p-4 md:p-5">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${submission.status === 'pending'
                                                        ? 'bg-amber-500/10 text-amber-300'
                                                        : 'bg-emerald-500/10 text-emerald-300'
                                                        }`}>
                                                        {submission.status === 'pending' ? 'Pendiente' : 'Revisado'}
                                                    </span>
                                                </div>
                                                <h2 className="mt-2 truncate text-lg font-black text-white">{exerciseName}</h2>
                                                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/55">
                                                    <UserRound className="h-3.5 w-3.5 text-primary" />
                                                    {studentName}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Link
                                                    href={`/dashboard/students/${submission.student_id}`}
                                                    className="inline-flex min-h-9 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[11px] font-bold text-white/55 transition hover:bg-white/[0.06] hover:text-white"
                                                >
                                                    Ver alumna
                                                </Link>
                                                <Link
                                                    href={`/dashboard/messages?student=${submission.student_id}`}
                                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 text-[11px] font-bold text-brand-soft transition hover:bg-primary/15"
                                                >
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                    Mensajes
                                                </Link>
                                            </div>
                                        </div>

                                        {submission.note && (
                                            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/15 p-3.5">
                                                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">Qué quiere que revises</p>
                                                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-white/70">{submission.note}</p>
                                            </div>
                                        )}

                                        <div className="mt-auto pt-4">
                                            {submission.status === 'pending' ? (
                                                <ReviewTechniqueVideoForm
                                                    submissionId={submission.id}
                                                    studentName={student?.first_name ?? studentName}
                                                />
                                            ) : (
                                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3.5">
                                                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Devolución enviada
                                                    </p>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-white/70">
                                                        {submission.trainer_feedback || 'Video marcado como revisado.'}
                                                    </p>
                                                    {submission.reviewed_at && (
                                                        <p className="mt-2 text-[10px] text-white/30">{formatDateTime(submission.reviewed_at)}</p>
                                                    )}
                                                </div>
                                            )}

                                            {submission.expires_at && (
                                                <p className="mt-3 text-[10px] text-white/25">
                                                    Conservación privada hasta el {formatDate(submission.expires_at)}.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </section>
            )}
        </TrainerPageShell>
    )
}

function SummaryCard({
    label,
    value,
    icon,
    accent,
}: {
    label: string
    value: number
    icon: React.ReactNode
    accent: 'amber' | 'green'
}) {
    const accentClass = accent === 'amber'
        ? 'border-amber-500/20 bg-amber-500/[0.06] text-amber-300'
        : 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300'

    return (
        <div className={`rounded-2xl border p-3.5 ${accentClass}`}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">{label}</p>
                {icon}
            </div>
            <p className="mt-2 text-2xl font-black">{value}</p>
        </div>
    )
}

function FilterLink({
    href,
    active,
    children,
}: {
    href: string
    active: boolean
    children: React.ReactNode
}) {
    return (
        <Link
            href={href}
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition ${active
                ? 'border-primary/30 bg-primary/10 text-brand-soft'
                : 'border-white/[0.07] bg-white/[0.025] text-white/40 hover:bg-white/[0.05] hover:text-white/70'
                }`}
        >
            {children}
        </Link>
    )
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(value))
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(value))
}

function formatDuration(seconds: number) {
    const safeSeconds = Math.max(0, Math.round(seconds))
    const minutes = Math.floor(safeSeconds / 60)
    const remainder = safeSeconds % 60
    return minutes > 0 ? `${minutes}:${String(remainder).padStart(2, '0')}` : `${remainder}s`
}

function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
