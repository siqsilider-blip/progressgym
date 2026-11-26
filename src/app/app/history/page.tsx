import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import {
    getStudentSessionHistoryResult,
    type SessionExerciseSummary,
    type SessionHistoryItem,
} from '@/app/dashboard/students/getStudentSessionHistory'
import {
    StudentNotebookHeader,
    notebookPage,
    notebookSectionTitle,
    notebookSummary,
} from '@/components/student/StudentNotebook'
import { getStudentAppContext } from '@/lib/auth/student'
import { EXERCISE_METRIC_SUFFIXES } from '@/lib/exerciseMetric'
import { formatSpanishLongDateLabel, formatSpanishMonthLabel, formatSpanishWeekdayLabel, isValidDateOnly } from '@/lib/routineCalendar'
import { createClient } from '@/lib/supabase/server'
import { formatWeight, type WeightUnit } from '@/lib/weight'

const HISTORY_LIMIT = 50

function formatDuration(seconds: number) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainder = seconds % 60
    return [
        hours > 0 && `${hours} h`,
        minutes > 0 && `${minutes} min`,
        remainder > 0 && `${remainder} s`,
    ].filter(Boolean).join(' ')
}

function formatBestExerciseResult(exercise: SessionExerciseSummary, weightUnit: WeightUnit) {
    if (exercise.metric === 'reps' && exercise.bestWeight !== null) {
        return formatWeight(exercise.bestWeight, weightUnit)
    }

    return exercise.bestReps === null ? null : `Mejor: ${exercise.bestReps} ${EXERCISE_METRIC_SUFFIXES[exercise.metric]}`
}

function groupByMonth(sessions: SessionHistoryItem[]) {
    const groups = new Map<string, SessionHistoryItem[]>()
    for (const session of sessions) {
        const month = isValidDateOnly(session.performedDate) ? session.performedDate.slice(0, 7) : ''
        const group = groups.get(month)
        if (group) group.push(session)
        else groups.set(month, [session])
    }
    return groups
}

function SessionDate({ date }: { date: string }) {
    if (!isValidDateOnly(date)) {
        return <span className="w-9 shrink-0 text-center text-xs text-muted-foreground">Sin fecha</span>
    }

    return (
        <time dateTime={date} className="w-9 shrink-0 text-center">
            <span className="sr-only">{formatSpanishLongDateLabel(date)}</span>
            <span aria-hidden="true" className="block text-xl font-semibold leading-none tabular-nums text-brand-soft">
                {Number(date.slice(-2))}
            </span>
            <span aria-hidden="true" className="mt-1 block text-xs text-muted-foreground">{formatSpanishWeekdayLabel(date)}</span>
        </time>
    )
}

function HistorySession({ session, weightUnit }: { session: SessionHistoryItem; weightUnit: WeightUnit }) {
    const isComplete = session.completionStatus === 'complete'
    const title = session.dayLabel.replace(/(\p{L})\s*[/|]\s*(?=\p{L})/gu, '$1 · ')
    const seconds = session.durationSeconds
    const duration = isComplete && seconds !== null && Number.isInteger(seconds) && seconds > 0 ? formatDuration(seconds) : null

    return (
        <details name="historial-del-alumno" className="group">
            <summary className={`${notebookSummary} group-open:text-brand-soft`}>
                <SessionDate date={session.performedDate} />
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-xs leading-relaxed text-muted-foreground">
                        <span className={isComplete ? undefined : 'font-medium text-amber-700 dark:text-amber-400'}>
                            {isComplete ? 'Completada' : 'Incompleta'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{session.totalSets} {session.totalSets === 1 ? 'serie' : 'series'}</span>
                    </span>
                </span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="space-y-3 pb-4 pl-12">
                <p className="text-xs text-muted-foreground">
                    {session.exercises.length} {session.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                    {duration && <> · {duration}</>}
                </p>
                {session.exercises.length > 0 && (
                    <ul className="border-y border-border">
                        {session.exercises.map((exercise) => {
                            const bestResult = formatBestExerciseResult(exercise, weightUnit)
                            return (
                                <li key={exercise.routineDayExerciseId} className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium [overflow-wrap:anywhere]">{exercise.exerciseName}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {exercise.sets} {exercise.sets === 1 ? 'serie' : 'series'}
                                            {exercise.avgRpe !== null && <> · RPE {exercise.avgRpe}</>}
                                        </p>
                                    </div>
                                    {bestResult && <p className="shrink-0 text-right text-xs font-semibold tabular-nums text-brand-soft">{bestResult}</p>}
                                </li>
                            )
                        })}
                    </ul>
                )}
                {session.note && (
                    <div className="border-l-2 border-primary/45 pl-3">
                        <p className="text-xs font-semibold text-muted-foreground">Nota de la sesión</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{session.note}</p>
                    </div>
                )}
                {session.canReview && (
                    <Link
                        href={`/app/train?session=${session.sessionId}&source=history`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-brand-soft hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        prefetch={false}
                    >
                        Revisar / editar sesión <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                    </Link>
                )}
            </div>
        </details>
    )
}

export default async function AppHistoryPage() {
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const studentId = context.profile.student_id
    if (!studentId) redirect('/app')

    const supabase = await createClient()
    const [studentResult, { sessions, error }] = await Promise.all([
        supabase.from('students').select('trainer_id').eq('id', studentId).single(),
        getStudentSessionHistoryResult(studentId, HISTORY_LIMIT),
    ])

    const trainerId = studentResult.data?.trainer_id
    const trainerProfile = trainerId && sessions.length > 0
        ? (await supabase.from('profiles').select('weight_unit').eq('id', trainerId).single()).data
        : null
    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit
    const monthGroups = groupByMonth(sessions)
    const completeCount = sessions.filter((session) => session.completionStatus === 'complete').length
    const totalSets = sessions.reduce((total, session) => total + session.totalSets, 0)

    return (
        <main className={notebookPage}>
            <div>
                <Link href="/app/progress" className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-brand-soft hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <ArrowLeft className="size-4" aria-hidden="true" /> Volver a Progreso
                </Link>
                <StudentNotebookHeader section="Registro de entrenamiento" title="Historial" />
            </div>

            {error ? (
                <p className="border-t border-border py-4 text-sm text-muted-foreground" role="alert">{error}</p>
            ) : sessions.length === 0 ? (
                <section className="space-y-2 border-t border-border py-4">
                    <h2 className={notebookSectionTitle}>Todavía no hay entrenamientos registrados</h2>
                    <p className="text-sm text-muted-foreground">Las sesiones con al menos una serie guardada aparecerán acá.</p>
                    <Link href="/app/rutina" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-soft">
                        Ver mi rutina <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </section>
            ) : (
                <>
                    <section aria-label="Resumen del historial" className="space-y-2 rounded-2xl bg-accent px-4 py-3.5">
                        <p className="text-xs font-semibold text-muted-foreground">
                            {sessions.length === HISTORY_LIMIT ? `Últimas ${HISTORY_LIMIT} sesiones` : 'Tu registro'}
                        </p>
                        <dl className="grid grid-cols-2 divide-x divide-border">
                            <div className="flex flex-col-reverse pr-3">
                                <dt className="text-xs text-muted-foreground">{completeCount === 1 ? 'Sesión completada' : 'Sesiones completadas'}</dt>
                                <dd className="text-2xl font-semibold tabular-nums text-brand-soft">{completeCount}</dd>
                            </div>
                            <div className="flex flex-col-reverse pl-3">
                                <dt className="text-xs text-muted-foreground">{totalSets === 1 ? 'Serie registrada' : 'Series registradas'}</dt>
                                <dd className="text-2xl font-semibold tabular-nums text-foreground">{totalSets}</dd>
                            </div>
                        </dl>
                    </section>
                    {[...monthGroups].map(([month, entries]) => (
                        <section key={month} aria-labelledby={`history-month-${month || 'unspecified'}`}>
                            <h2 id={`history-month-${month || 'unspecified'}`} className={`mb-2 ${notebookSectionTitle}`}>
                                {month ? formatSpanishMonthLabel(`${month}-01`) : 'Fecha sin registrar'}
                            </h2>
                            {entries.map((session) => <HistorySession key={session.sessionId} session={session} weightUnit={weightUnit} />)}
                        </section>
                    ))}
                </>
            )}
        </main>
    )
}
