import Link from 'next/link'
import {
    BarChart3,
    Bell,
    Camera,
    Check,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Dumbbell,
    Sparkles,
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
    if (day.status === 'partial') return { eyebrow: 'Sesión parcial', action: 'Completar pendientes' }
    if (day.scheduledDate === today) return { eyebrow: 'Entrenamiento de hoy', action: 'Empezar entrenamiento' }
    if (day.scheduledDate && day.scheduledDate < today) return { eyebrow: 'Entrenamiento pendiente', action: 'Completar entrenamiento' }
    return { eyebrow: 'Próximo entrenamiento', action: 'Ver entrenamiento' }
}

function dayStatus(day: StudentHomeTrainingDay, today: string) {
    if (day.status === 'completed') return { label: 'Hecho', tone: 'text-emerald-400', dot: 'bg-emerald-400' }
    if (day.status === 'in_progress') return { label: 'En curso', tone: 'text-primary', dot: 'bg-primary' }
    if (day.status === 'partial') {
        return { label: 'Parcial', tone: 'text-amber-400', dot: 'bg-amber-400' }
    }
    if (day.scheduledDate && day.scheduledDate < today) {
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
    completedDays,
    totalTrainingDays,
    weekCompleted,
    programWeekNumber,
    totalProgramWeeks,
}: Props) {
    const copy = primaryCopy(selectedDay, today)
    const progress = totalTrainingDays > 0 ? Math.round((completedDays / totalTrainingDays) * 100) : 0
    const needsCheckIn = !weeklyCheckinCompleted || progressPhotoDue
    const hasVisibleRoutine = Boolean(routineName && (selectedDay || weekCompleted))
    const showOnboardingTask = hasVisibleRoutine && !onboardingCompleted
    const showCheckInTask = hasVisibleRoutine && onboardingCompleted && needsCheckIn

    return (
        <main className="px-4 pb-28 pt-5 md:px-6">
            <div className="mx-auto max-w-lg space-y-4">
                <header className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-brand-soft">
                            {sentenceCase(formatSpanishLongDateLabel(today))}
                        </p>
                        <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-foreground">
                            {greeting}, {firstName}
                        </h1>
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
                            <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">¡Excelente trabajo!</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Completaste los {totalTrainingDays} entrenamientos de esta semana.
                            </p>
                            <Link href={routineHref} className="mt-4 flex min-h-12 items-center justify-between rounded-2xl bg-emerald-500 px-4 text-sm font-black text-black transition active:scale-[0.98]">
                                Revisar mi semana
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
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <Dumbbell className="h-4 w-4 text-primary" aria-hidden="true" />
                                    {selectedDay.exerciseCount} ejercicios
                                </span>
                                {totalProgramWeeks > 1 && <span>Semana {programWeekNumber} de {totalProgramWeeks}</span>}
                            </div>

                            <Link href={selectedDay.href} className="mt-4 flex min-h-14 items-center justify-between rounded-2xl bg-primary px-5 text-base font-black text-primary-foreground shadow-lg shadow-primary/15 transition active:scale-[0.98]">
                                {copy.action}
                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                            </Link>
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
                    <section className="overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="student-week-heading">
                        <div className="p-4 pb-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 id="student-week-heading" className="text-base font-black text-foreground">Tus entrenamientos</h2>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        {completedDays} de {totalTrainingDays} entrenamientos
                                        {totalProgramWeeks > 1 ? ` · Semana ${programWeekNumber} de ${totalProgramWeeks}` : ''}
                                    </p>
                                </div>
                                <Link href={routineHref} className="inline-flex min-h-11 shrink-0 items-center gap-1 px-1 text-sm font-black text-primary">
                                    Ver calendario
                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </Link>
                            </div>
                            <div
                                role="progressbar"
                                aria-label="Progreso semanal"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progress}
                                aria-valuetext={`${completedDays} de ${totalTrainingDays} entrenamientos completados`}
                                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                            >
                                <div
                                    className={`h-full rounded-full transition-all ${weekCompleted ? 'bg-emerald-500' : 'bg-primary'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <div className="divide-y divide-border border-t border-border">
                            {trainingDays.map((day) => {
                                const status = dayStatus(day, today)
                                const active = selectedDay?.id === day.id && !weekCompleted
                                return (
                                    <Link
                                        key={day.id}
                                        href={day.href}
                                        aria-label={`${day.name}, ${day.scheduledDate ? formatSpanishLongDateLabel(day.scheduledDate) : 'sin fecha'}, ${status.label}`}
                                        className={`flex min-h-14 items-center gap-3 px-4 py-2.5 transition active:bg-muted/70 ${active ? 'bg-primary/[0.07]' : ''}`}
                                    >
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${day.status === 'completed' ? 'bg-emerald-500/10' : active ? 'bg-primary/10' : 'bg-muted'}`}>
                                            {day.status === 'completed'
                                                ? <Check className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                                                : <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-xs font-bold capitalize text-muted-foreground">
                                                {day.scheduledDate ? formatSpanishDayLabel(day.scheduledDate) : 'Sin fecha'}
                                            </span>
                                            <span className="mt-0.5 block truncate text-sm font-black text-foreground">{day.name}</span>
                                        </span>
                                        <span className={`shrink-0 text-xs font-bold ${status.tone}`}>{status.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </section>
                )}

                {(showOnboardingTask || showCheckInTask) && (
                    <section className="rounded-2xl border border-border bg-card p-3" aria-labelledby="student-actions-heading">
                        <Link
                            href={showOnboardingTask ? '/app/onboarding' : '/app/check-in'}
                            prefetch
                            className="flex min-h-14 items-center gap-3 rounded-xl px-1.5 transition active:bg-muted/60"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                {showOnboardingTask
                                    ? <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                                    : progressPhotoDue
                                        ? <Camera className="h-5 w-5" aria-hidden="true" />
                                        : <Sparkles className="h-5 w-5" aria-hidden="true" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span id="student-actions-heading" className="block text-sm font-black text-foreground">
                                    {showOnboardingTask
                                        ? 'Completá tu ficha inicial'
                                        : progressPhotoDue
                                            ? 'Actualizá tu progreso'
                                            : 'Control semanal · 1 minuto'}
                                </span>
                                <span className="block text-xs leading-5 text-muted-foreground">
                                    {showOnboardingTask
                                        ? 'Objetivos, disponibilidad y cuidados.'
                                        : progressPhotoDue
                                            ? 'Control, medidas y fotos privadas.'
                                            : 'Contanos cómo te sentiste esta semana.'}
                                </span>
                            </span>
                            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                    </section>
                )}

                <section className="overflow-hidden rounded-2xl border border-border bg-card" aria-label="Progreso e historial">
                    <Link href="/app/progress" prefetch className="flex min-h-16 items-center gap-3 px-4 py-3 transition active:bg-muted/60">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <BarChart3 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-foreground">Mi progreso</span>
                            <span className="block text-xs leading-5 text-muted-foreground">Medidas, fotos y evolución.</span>
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                    <div className="grid grid-cols-2 border-t border-border">
                        <Link href="/app/history" prefetch className="flex min-h-12 items-center justify-center border-r border-border px-3 text-sm font-bold text-foreground transition active:bg-muted/60">
                            Historial
                        </Link>
                        <Link href="/app/logros" prefetch className="flex min-h-12 items-center justify-center px-3 text-sm font-bold text-foreground transition active:bg-muted/60">
                            Logros
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    )
}
