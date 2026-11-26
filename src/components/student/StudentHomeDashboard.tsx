import Link from 'next/link'
import { ArrowRight, Bell, CalendarDays, Camera, ChevronRight, ClipboardCheck } from 'lucide-react'
import StudentHomeUnreadMessages from './StudentHomeUnreadMessages'
import { formatSpanishLongDateLabel } from '@/lib/routineCalendar'
import type { RoutineDayProgressStatus } from '@/lib/studentRoutineWeekProgress'

export type StudentHomeDayAvailability = 'available' | 'continue' | 'review' | 'locked_today'

export type StudentHomeTrainingDay = {
    id: string
    name: string
    status: RoutineDayProgressStatus
    availability: StudentHomeDayAvailability
    exerciseCount: number
    href: string
}

type Props = {
    firstName: string
    today: string
    routineName: string | null
    routineHref: string
    unreadNotifications: number
    onboardingCompleted: boolean
    weeklyCheckinCompleted: boolean
    progressPhotoDue: boolean
    trainingDays: StudentHomeTrainingDay[]
    selectedDay: StudentHomeTrainingDay | null
    suggestedTrainingDays: string[]
    completedDays: number
    totalTrainingDays: number
    weekCompleted: boolean
    programWeekNumber: number
    totalProgramWeeks: number
    programDateRange: string | null
    nextSuggestion: { dateLabel: string; workoutName: string | null } | null
    restDay: boolean
    upcomingStart: string | null
    currentSession: {
        savedSets: number
        totalSets: number
        nextExercise: { name: string | null; exerciseNumber: number; setNumber: number; exerciseSets: number } | null
    } | null
}

const workoutNameList = new Intl.ListFormat('es-AR', { style: 'long', type: 'conjunction' })

function cleanWorkoutName(name: string) {
    if (!name.includes('|')) return name
    const parts = name.split('|').map((part) => part.trim()).filter(Boolean)
    return parts.length ? workoutNameList.format(parts) : name
}

function primaryCopy(day: StudentHomeTrainingDay) {
    if (day.status === 'completed') return { label: 'Entrenamiento de hoy completado', action: 'Revisar entrenamiento' }
    if (day.status === 'in_progress') return { label: 'Sesión en curso', action: 'Continuar entrenamiento' }
    if (day.status === 'partial') return { label: 'Sesión parcial', action: 'Completar pendientes' }
    return { label: 'Tu entrenamiento de hoy', action: 'Empezar entrenamiento' }
}

const displayType = 'font-[family-name:Georgia,"Times_New_Roman",serif] font-normal tracking-[-0.045em] [overflow-wrap:anywhere]'
const primaryLink = 'mt-4 flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition hover:opacity-90 active:opacity-80 sm:text-base'
const rowLink = 'flex min-h-12 min-w-0 items-center gap-3 rounded-md py-2.5 text-sm transition hover:text-brand-soft active:opacity-80'

function TrainingHero({
    routineHref, hasTraining, weekCompleted, totalTrainingDays, selectedDay, onboardingCompleted, currentSession, restDay, upcomingStart,
}: Pick<Props, 'routineHref' | 'weekCompleted' | 'totalTrainingDays' | 'selectedDay' | 'onboardingCompleted' | 'currentSession' | 'restDay' | 'upcomingStart'> & { hasTraining: boolean }) {
    let title: string
    let label: string | null = null
    let description: string | null = null
    let action: { href: string; label: string } | null = null

    if (weekCompleted) {
        title = 'Semana completada'
        description = totalTrainingDays === 1 ? 'Completaste el entrenamiento de esta semana.' : `Completaste los ${totalTrainingDays} entrenamientos de esta semana.`
        action = { href: routineHref, label: 'Revisar mi semana' }
    } else if (hasTraining && selectedDay) {
        title = cleanWorkoutName(selectedDay.name)
        const copy = primaryCopy(selectedDay)
        label = copy.label
        action = { href: selectedDay.href, label: copy.action }

        if (currentSession?.nextExercise) {
            const { name, exerciseNumber, setNumber, exerciseSets } = currentSession.nextExercise
            description = `${name ?? `Ejercicio ${exerciseNumber}`} · Serie ${setNumber} de ${exerciseSets}`
        } else if (currentSession && currentSession.savedSets === currentSession.totalSets) {
            description = 'Todas las series están guardadas.'
        } else {
            description = `${selectedDay.exerciseCount} ${selectedDay.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`
        }
    } else if (hasTraining && upcomingStart) {
        title = 'Tu programa está listo'
        description = `Empezás el ${upcomingStart.toLocaleLowerCase('es-AR')}.`
    } else if (hasTraining && restDay) {
        title = 'Hoy toca descansar'
    } else if (hasTraining) {
        title = 'Por hoy estás al día'
        description = 'Podés revisar las sesiones de esta semana en tu programa.'
        action = { href: routineHref, label: 'Ver mi programa' }
    } else if (onboardingCompleted) {
        title = 'Tu entrenador está preparando tu programa'
        description = 'Cuando esté listo, vas a encontrar acá tu próximo entrenamiento.'
    } else {
        title = 'Empecemos por conocerte'
        description = 'Contanos tus objetivos, disponibilidad y cuidados.'
        action = { href: '/app/onboarding', label: 'Completar mi ficha' }
    }

    return (
        <section className="rounded-[1.5rem] bg-accent p-4 text-accent-foreground sm:p-6" aria-labelledby="student-today-heading">
            {label && <p className="mb-2 text-sm font-semibold text-brand-soft">{label}</p>}
            <h2 id="student-today-heading" className={`max-w-[22ch] text-[1.95rem] leading-[1.08] sm:text-[2.4rem] ${displayType}`}>
                {title}
            </h2>
            {description && <p className="mt-2 text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere]">{description}</p>}

            {currentSession && selectedDay && !weekCompleted && currentSession.totalSets > 0 && (
                <div className="mt-4 space-y-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:text-sm">
                        {currentSession.nextExercise && (
                            <span>Ejercicio {currentSession.nextExercise.exerciseNumber} de {selectedDay.exerciseCount}</span>
                        )}
                        <span className="ml-auto tabular-nums">{currentSession.savedSets} de {currentSession.totalSets} series</span>
                    </div>
                    <div
                        role="progressbar"
                        aria-label="Series guardadas"
                        aria-valuemin={0}
                        aria-valuemax={currentSession.totalSets}
                        aria-valuenow={currentSession.savedSets}
                        className="h-1 overflow-hidden rounded-full bg-primary/20"
                    >
                        <div className="h-full rounded-full bg-primary" style={{ width: `${100 * currentSession.savedSets / currentSession.totalSets}%` }} />
                    </div>
                </div>
            )}

            {action && (
                <Link href={action.href} prefetch={false} className={primaryLink}>
                    {action.label}
                    <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                </Link>
            )}
        </section>
    )
}

export default function StudentHomeDashboard({
    firstName,
    today,
    routineName,
    routineHref,
    unreadNotifications,
    onboardingCompleted,
    weeklyCheckinCompleted,
    progressPhotoDue,
    trainingDays,
    selectedDay,
    suggestedTrainingDays,
    completedDays,
    totalTrainingDays,
    weekCompleted,
    programWeekNumber,
    totalProgramWeeks,
    programDateRange,
    nextSuggestion,
    restDay,
    upcomingStart,
    currentSession,
}: Props) {
    const dateLabel = formatSpanishLongDateLabel(today)
    const hasTraining = Boolean(routineName && totalTrainingDays > 0)
    const showOnboardingTask = hasTraining && !onboardingCompleted
    const showCheckInTask = hasTraining && onboardingCompleted && (!weeklyCheckinCompleted || progressPhotoDue)

    return (
        <main className="px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
            <div className="mx-auto max-w-lg space-y-5">
                <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-soft">
                            {dateLabel.charAt(0).toLocaleUpperCase('es-AR') + dateLabel.slice(1)}
                        </p>
                        <h1 className={`mt-1.5 text-[2.5rem] leading-none text-foreground sm:text-5xl ${displayType}`}>
                            Hola, {firstName}
                        </h1>
                    </div>
                    <Link
                        href="/app/notifications"
                        prefetch={false}
                        aria-label={unreadNotifications > 0
                            ? `Ver ${unreadNotifications} ${unreadNotifications === 1 ? 'aviso nuevo' : 'avisos nuevos'}`
                            : 'Ver avisos'}
                        className="relative grid size-11 shrink-0 place-items-center rounded-full border border-border text-foreground transition hover:bg-accent active:bg-accent"
                    >
                        <Bell className="size-5" aria-hidden="true" />
                        {unreadNotifications > 0 && (
                            <span aria-hidden="true" className="absolute -right-0.5 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                                {unreadNotifications > 9 ? '9+' : unreadNotifications}
                            </span>
                        )}
                    </Link>
                </header>

                <StudentHomeUnreadMessages />

                <TrainingHero
                    hasTraining={hasTraining}
                    routineHref={routineHref}
                    weekCompleted={weekCompleted}
                    totalTrainingDays={totalTrainingDays}
                    selectedDay={selectedDay}
                    onboardingCompleted={onboardingCompleted}
                    currentSession={currentSession}
                    restDay={restDay}
                    upcomingStart={upcomingStart}
                />

                {hasTraining && (
                    <section className="space-y-2" aria-labelledby="student-week-heading">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <h2 id="student-week-heading" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Esta semana</h2>
                            <p className="text-sm font-semibold text-foreground tabular-nums">{completedDays} de {totalTrainingDays} completados</p>
                        </div>
                        <div
                            className="flex gap-1.5"
                            role="progressbar"
                            aria-label="Entrenamientos completados esta semana"
                            aria-valuemin={0}
                            aria-valuemax={totalTrainingDays}
                            aria-valuenow={completedDays}
                        >
                            {trainingDays.map((day) => (
                                <span
                                    key={day.id}
                                    aria-hidden="true"
                                    className={`h-2 flex-1 rounded-full ${day.status === 'completed' ? 'bg-primary'
                                        : day.status === 'in_progress' || day.status === 'partial' ? 'bg-primary/40' : 'bg-muted'}`}
                                />
                            ))}
                        </div>
                        {suggestedTrainingDays.length > 0 && (
                            <p className="text-xs text-muted-foreground sm:text-sm">Días sugeridos · {suggestedTrainingDays.join(' · ')}</p>
                        )}
                    </section>
                )}

                {routineName && totalProgramWeeks > 0 && (
                    <section className="border-t border-border pt-2" aria-label="Programa">
                        <Link href={routineHref} className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-md py-1.5 transition hover:text-brand-soft active:opacity-80">
                            <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                                <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{routineName}</span>
                                <span className="ml-auto shrink-0 text-xs text-muted-foreground sm:text-sm">Semana {programWeekNumber} de {totalProgramWeeks}</span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                        <div
                            role="progressbar"
                            aria-label="Posición en el programa"
                            aria-valuemin={0}
                            aria-valuemax={totalProgramWeeks}
                            aria-valuenow={programWeekNumber}
                            aria-valuetext={`Semana ${programWeekNumber} de ${totalProgramWeeks}`}
                            className="h-1 overflow-hidden rounded-full bg-muted"
                        >
                            <div className="h-full rounded-full bg-primary" style={{ width: `${100 * programWeekNumber / totalProgramWeeks}%` }} />
                        </div>
                        {programDateRange && <p className="mt-1.5 text-xs text-muted-foreground">{programDateRange}</p>}
                    </section>
                )}

                {nextSuggestion && (
                    <div className="border-t border-border">
                        <Link href={routineHref} className={rowLink}>
                            <CalendarDays className="size-4 shrink-0 text-brand-soft" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold [overflow-wrap:anywhere]">
                                    {nextSuggestion.workoutName ? cleanWorkoutName(nextSuggestion.workoutName) : 'Próximo día sugerido'}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {nextSuggestion.workoutName ? 'Día sugerido · ' : ''}{nextSuggestion.dateLabel}
                                </span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                    </div>
                )}

                {(showOnboardingTask || showCheckInTask) && (
                    <div className="border-t border-border">
                        <Link href={showOnboardingTask ? '/app/onboarding' : '/app/check-in'} className={rowLink}>
                            {showOnboardingTask || !progressPhotoDue
                                ? <ClipboardCheck className="size-4 shrink-0 text-brand-soft" aria-hidden="true" />
                                : <Camera className="size-4 shrink-0 text-brand-soft" aria-hidden="true" />}
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold">
                                    {showOnboardingTask ? 'Completá tu ficha inicial' : progressPhotoDue ? 'Actualizá tu progreso' : 'Control semanal'}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {showOnboardingTask ? 'Objetivos, disponibilidad y cuidados.'
                                        : progressPhotoDue ? 'Control, medidas y fotos privadas.' : 'Contale a tu entrenador cómo te sentiste.'}
                                </span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                    </div>
                )}
            </div>
        </main>
    )
}
