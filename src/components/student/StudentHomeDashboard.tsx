import Link from 'next/link'
import {
    BarChart3,
    Bell,
    Camera,
    Check,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Clock3,
    Dumbbell,
    Sparkles,
    Trophy,
} from 'lucide-react'
import {
    formatSpanishDayLabel,
    formatSpanishLongDateLabel,
} from '@/lib/routineCalendar'
import type { RoutineDayProgressStatus } from '@/lib/studentRoutineWeekProgress'

export type StudentHomeTrainingDay = {
    id: string
    name: string
    scheduledDate: string | null
    status: RoutineDayProgressStatus
    exerciseCount: number
    totalSets: number
    href: string
}

type ExercisePreview = {
    name: string
    sets: number
    reps: string | null
}

type Props = {
    greeting: string
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
    selectedExercises: ExercisePreview[]
    completedDays: number
    totalTrainingDays: number
    weekCompleted: boolean
    programWeekNumber: number
    totalProgramWeeks: number
}

function sentenceCase(value: string) {
    return value ? value.charAt(0).toLocaleUpperCase('es-AR') + value.slice(1) : value
}

function primaryCopy(day: StudentHomeTrainingDay | null, today: string) {
    if (!day) return { eyebrow: 'Tu entrenamiento', action: 'Abrir rutina' }
    if (day.status === 'in_progress') return { eyebrow: 'Sesión en curso', action: 'Continuar entrenamiento' }
    if (day.status === 'incomplete') return { eyebrow: 'Series pendientes', action: 'Completar entrenamiento' }
    if (day.scheduledDate === today) return { eyebrow: 'Entrenamiento de hoy', action: 'Empezar entrenamiento' }
    if (day.scheduledDate && day.scheduledDate < today) return { eyebrow: 'Entrenamiento pendiente', action: 'Completar entrenamiento' }
    return { eyebrow: 'Próximo entrenamiento', action: 'Ver entrenamiento' }
}

function dayStatus(day: StudentHomeTrainingDay, today: string) {
    if (day.status === 'completed') return { label: 'Hecho', tone: 'text-emerald-400', dot: 'bg-emerald-400' }
    if (day.status === 'in_progress') return { label: 'En curso', tone: 'text-primary', dot: 'bg-primary' }
    if (day.status === 'incomplete' || (day.scheduledDate && day.scheduledDate < today)) {
        return { label: 'Pendiente', tone: 'text-amber-400', dot: 'bg-amber-400' }
    }
    if (day.scheduledDate === today) return { label: 'Hoy', tone: 'text-primary', dot: 'bg-primary' }
    return { label: 'Programado', tone: 'text-muted-foreground', dot: 'bg-muted-foreground' }
}

export default function StudentHomeDashboard({
    greeting,
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
    selectedExercises,
    completedDays,
    totalTrainingDays,
    weekCompleted,
    programWeekNumber,
    totalProgramWeeks,
}: Props) {
    const copy = primaryCopy(selectedDay, today)
    const preview = selectedExercises.slice(0, 3)
    const remainingExercises = Math.max(0, selectedExercises.length - preview.length)
    const progress = totalTrainingDays > 0 ? Math.round((completedDays / totalTrainingDays) * 100) : 0
    const needsCheckIn = !weeklyCheckinCompleted || progressPhotoDue

    return (
        <main className="px-4 pb-28 pt-5 md:px-6">
            <div className="mx-auto max-w-lg space-y-5">
                <header className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-brand-soft">
                            {sentenceCase(formatSpanishLongDateLabel(today))}
                        </p>
                        <h1 className="mt-1 text-[1.65rem] font-black leading-tight tracking-tight text-foreground">
                            {greeting}, {firstName}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {routineName ? 'Tu entrenamiento, claro y a mano.' : 'Tu espacio de entrenamiento.'}
                        </p>
                    </div>
                    <Link
                        href="/app/notifications"
                        prefetch
                        aria-label={unreadNotifications > 0
                            ? `Ver ${unreadNotifications} ${unreadNotifications === 1 ? 'aviso nuevo' : 'avisos nuevos'}`
                            : 'Ver avisos'}
                        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm transition active:scale-95"
                    >
                        <Bell className="h-5 w-5" aria-hidden="true" />
                        {unreadNotifications > 0 && (
                            <span
                                aria-hidden="true"
                                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-black text-primary-foreground"
                            >
                                {Math.min(unreadNotifications, 9)}
                            </span>
                        )}
                    </Link>
                </header>

                {routineName && weekCompleted ? (
                    <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-500/25 bg-card p-5 shadow-sm">
                        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
                        <div className="relative">
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                Semana completada
                            </span>
                            <h2 className="mt-4 text-2xl font-black tracking-tight text-foreground">¡Excelente trabajo!</h2>
                            <p className="mt-1 text-sm font-bold text-foreground">{routineName}</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Completaste {completedDays} de {totalTrainingDays} entrenamientos. Tu calendario y tus registros quedan disponibles para revisar.
                            </p>
                            <Link href={routineHref} className="mt-5 flex min-h-12 items-center justify-between rounded-2xl bg-emerald-500 px-4 text-sm font-black text-black transition active:scale-[0.98]">
                                Ver semana completa
                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                            </Link>
                        </div>
                    </section>
                ) : routineName && selectedDay ? (
                    <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/30 bg-card shadow-[0_18px_50px_-30px_rgba(201,135,150,0.8)]">
                        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
                        <div className="relative p-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-primary/12 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-primary">
                                    {copy.eyebrow}
                                </span>
                                {selectedDay.scheduledDate && (
                                    <span className="text-sm font-semibold text-muted-foreground">
                                        {sentenceCase(formatSpanishLongDateLabel(selectedDay.scheduledDate))}
                                    </span>
                                )}
                            </div>

                            <h2 className="mt-4 text-[1.65rem] font-black leading-tight tracking-tight text-foreground">
                                {selectedDay.name}
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-brand-soft">
                                {routineName}{totalProgramWeeks > 1 ? ` · Semana ${programWeekNumber} de ${totalProgramWeeks}` : ''}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <Dumbbell className="h-4 w-4 text-primary" aria-hidden="true" />
                                    {selectedDay.exerciseCount} ejercicios
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                                    {selectedDay.totalSets} series
                                </span>
                            </div>

                            <Link href={selectedDay.href} className="mt-5 flex min-h-14 items-center justify-between rounded-2xl bg-primary px-5 text-base font-black text-primary-foreground shadow-lg shadow-primary/15 transition active:scale-[0.98]">
                                {copy.action}
                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                            </Link>

                            {preview.length > 0 && (
                                <div className="mt-4 rounded-2xl border border-border/80 bg-background/65 p-3.5">
                                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Vista rápida</p>
                                    <div className="mt-2.5 space-y-2">
                                        {preview.map((exercise, index) => (
                                            <div key={`${exercise.name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                                                <span className="min-w-0 truncate font-semibold text-foreground">
                                                    {index + 1}. {exercise.name}
                                                </span>
                                                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                                                    {exercise.sets} × {exercise.reps ?? '—'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {remainingExercises > 0 && (
                                        <p className="mt-2 text-xs font-semibold text-brand-soft">+ {remainingExercises} ejercicios más</p>
                                    )}
                                </div>
                            )}

                            <div className="mt-4">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="font-bold text-foreground">Tu semana</span>
                                    <span className="font-semibold text-muted-foreground">{completedDays} de {totalTrainingDays}</span>
                                </div>
                                <div
                                    role="progressbar"
                                    aria-label="Progreso semanal"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={progress}
                                    aria-valuetext={`${completedDays} de ${totalTrainingDays} entrenamientos completados`}
                                    className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                                >
                                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                                </div>
                            </div>

                        </div>
                    </section>
                ) : (
                    <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card p-6 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            {onboardingCompleted ? <Dumbbell className="h-7 w-7" /> : <ClipboardCheck className="h-7 w-7" />}
                        </div>
                        <h2 className="mt-4 text-xl font-black text-foreground">
                            {onboardingCompleted ? 'Tu entrenador está preparando tu programa' : 'Empecemos por conocerte'}
                        </h2>
                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                            {onboardingCompleted
                                ? 'Cuando la rutina esté lista, vas a encontrar acá tu próximo entrenamiento y el calendario completo.'
                                : 'Completá tus objetivos, disponibilidad y cuidados para recibir una rutina adecuada para vos.'}
                        </p>
                        {!onboardingCompleted && (
                            <Link href="/app/onboarding" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground">
                                Completar mi ficha
                            </Link>
                        )}
                    </section>
                )}

                {trainingDays.length > 0 && (
                    <section aria-labelledby="student-week-heading">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-brand-soft">Plan semanal</p>
                                <h2 id="student-week-heading" className="mt-0.5 text-lg font-black text-foreground">Tus entrenamientos</h2>
                            </div>
                            <Link href={routineHref} className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-primary">
                                Ver calendario
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </div>
                        <div className="mt-3 grid [grid-template-columns:repeat(auto-fit,minmax(96px,1fr))] gap-2.5">
                            {trainingDays.map((day) => {
                                const status = dayStatus(day, today)
                                const active = selectedDay?.id === day.id && !weekCompleted
                                return (
                                    <Link
                                        key={day.id}
                                        href={day.href}
                                        aria-label={`${day.name}, ${day.scheduledDate ? formatSpanishLongDateLabel(day.scheduledDate) : 'sin fecha'}, ${status.label}`}
                                        className={`min-w-0 rounded-2xl border p-3 transition active:scale-[0.98] ${active
                                            ? 'border-primary/55 bg-primary/[0.09] shadow-sm'
                                            : day.status === 'completed'
                                                ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
                                                : 'border-border bg-card'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-black capitalize text-muted-foreground">
                                                {day.scheduledDate ? formatSpanishDayLabel(day.scheduledDate) : 'Sin fecha'}
                                            </span>
                                            {day.status === 'completed'
                                                ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                                                : <span className={`h-2 w-2 rounded-full ${status.dot}`} />}
                                        </div>
                                        <p className="mt-2 line-clamp-2 min-h-10 text-sm font-black leading-5 text-foreground">{day.name}</p>
                                        <p className={`mt-1 text-xs font-bold ${status.tone}`}>{status.label}</p>
                                    </Link>
                                )
                            })}
                        </div>
                        {totalProgramWeeks > 1 && (
                            <p className="mt-2.5 text-xs font-semibold text-muted-foreground">
                                Semana {programWeekNumber} de {totalProgramWeeks} · el calendario avanza automáticamente.
                            </p>
                        )}
                    </section>
                )}

                {(!onboardingCompleted || needsCheckIn) && (
                    <section className="rounded-2xl border border-border bg-card p-3.5" aria-labelledby="student-actions-heading">
                        <div className="flex items-center gap-2 px-1">
                            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                            <h2 id="student-actions-heading" className="text-sm font-black text-foreground">Para vos</h2>
                        </div>
                        <div className="mt-2 space-y-1.5">
                            {!onboardingCompleted && (
                                <Link href="/app/onboarding" className="flex min-h-14 items-center gap-3 rounded-xl px-2.5 transition hover:bg-muted/60">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardCheck className="h-5 w-5" /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black text-foreground">Completá tu ficha inicial</span>
                                        <span className="block text-xs text-muted-foreground">Objetivos, disponibilidad y cuidados.</span>
                                    </span>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </Link>
                            )}
                            {needsCheckIn && (
                                <Link href="/app/check-in" prefetch className="flex min-h-14 items-center gap-3 rounded-xl px-2.5 transition hover:bg-muted/60">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        {progressPhotoDue ? <Camera className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black text-foreground">
                                            {progressPhotoDue ? 'Actualizá tu progreso' : 'Control semanal · 1 minuto'}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {progressPhotoDue ? 'Control, medidas y fotos privadas.' : 'Energía, descanso, estrés y molestias.'}
                                        </span>
                                    </span>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </Link>
                            )}
                        </div>
                    </section>
                )}

                <section className="grid grid-cols-2 gap-3" aria-label="Accesos de seguimiento">
                    <Link href="/app/progress" prefetch className="rounded-2xl border border-border bg-card p-4 transition active:scale-[0.98]">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></span>
                        <p className="mt-3 text-sm font-black text-foreground">Mi progreso</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Medidas, fotos y evolución.</p>
                    </Link>
                    <Link href="/app/logros" prefetch className="rounded-2xl border border-border bg-card p-4 transition active:scale-[0.98]">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><Trophy className="h-5 w-5" /></span>
                        <p className="mt-3 text-sm font-black text-foreground">Mis logros</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Constancia y objetivos.</p>
                    </Link>
                </section>
            </div>
        </main>
    )
}
