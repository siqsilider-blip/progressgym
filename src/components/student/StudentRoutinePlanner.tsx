'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    AlertTriangle,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Circle,
    Dumbbell,
    Loader2,
    Play,
    Settings2,
} from 'lucide-react'
import { saveActiveTrainingWeekdays } from '@/app/app/rutina/actions'
import {
    buildMondayFirstMonthGrid,
    enumerateDateRange,
    formatSpanishLongDateLabel,
    formatSpanishMonthLabel,
    formatSpanishWeekRange,
    getIsoWeekday,
    type IsoWeekday,
} from '@/lib/routineCalendar'

export type RoutinePlannerStatus = 'pending' | 'in_progress' | 'incomplete' | 'completed'

export type RoutinePlannerExercise = {
    name: string
    sets: number
    reps: string | null
}

export type RoutinePlannerDay = {
    id: string
    name: string
    dayIndex: number
    scheduledDate: string | null
    status: RoutinePlannerStatus
    exercises: RoutinePlannerExercise[]
}

export type RoutinePlannerWeek = {
    id: string
    monthId: string | null
    name: string
    programWeekNumber: number
    weekStart: string | null
    weekEnd: string | null
    isCurrent: boolean
    days: RoutinePlannerDay[]
}

type PlannerView = 'week' | 'month'

type Props = {
    routineName: string
    weeks: RoutinePlannerWeek[]
    totalProgramWeeks: number
    initialWeekId: string | null
    initialDayId: string | null
    initialView: PlannerView
    today: string
    trainingWeekdays: number[] | null
    preferredWeekdays: number[] | null
    requiredTrainingDays: number
}

const WEEKDAYS: { value: IsoWeekday; short: string; label: string }[] = [
    { value: 1, short: 'Lun', label: 'Lunes' },
    { value: 2, short: 'Mar', label: 'Martes' },
    { value: 3, short: 'Mié', label: 'Miércoles' },
    { value: 4, short: 'Jue', label: 'Jueves' },
    { value: 5, short: 'Vie', label: 'Viernes' },
    { value: 6, short: 'Sáb', label: 'Sábado' },
    { value: 7, short: 'Dom', label: 'Domingo' },
]

function chooseInitialDay(week: RoutinePlannerWeek | undefined, requestedDayId: string | null, today: string) {
    if (!week) return null
    const requested = week.days.find((day) => day.id === requestedDayId)
    if (requested) return requested.id

    return week.days.find((day) => day.status === 'in_progress')?.id
        ?? week.days.find((day) => day.scheduledDate === today)?.id
        ?? week.days.find((day) => day.status !== 'completed' && (day.scheduledDate ?? '') >= today)?.id
        ?? week.days.find((day) => day.status !== 'completed')?.id
        ?? week.days[0]?.id
        ?? null
}

function monthKey(date: string | null | undefined) {
    return date?.slice(0, 7) ?? ''
}

function statusLabel(status: RoutinePlannerStatus) {
    if (status === 'completed') return 'Completado'
    if (status === 'in_progress') return 'En curso'
    if (status === 'incomplete') return 'Con series pendientes'
    return 'Programado'
}

function ctaLabel(status: RoutinePlannerStatus) {
    if (status === 'completed') return 'Revisar / editar'
    if (status === 'in_progress') return 'Continuar →'
    if (status === 'incomplete') return 'Completar →'
    return 'Entrenar →'
}

function TrainingDayIcon({ status }: { status: RoutinePlannerStatus }) {
    if (status === 'completed') return <Check className="h-3.5 w-3.5" aria-hidden="true" />
    if (status === 'in_progress') return <Play className="h-3.5 w-3.5" aria-hidden="true" />
    if (status === 'incomplete') return <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
    return <Circle className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
}

function TrainingWeekdayEditor({
    requiredTrainingDays,
    initialWeekdays,
    onCancel,
}: {
    requiredTrainingDays: number
    initialWeekdays: number[]
    onCancel?: () => void
}) {
    const router = useRouter()
    const [selected, setSelected] = useState<number[]>(initialWeekdays)
    const [error, setError] = useState('')
    const [pending, startTransition] = useTransition()

    function toggle(day: number) {
        setError('')
        setSelected((current) => {
            if (current.includes(day)) return current.filter((value) => value !== day)
            if (current.length >= requiredTrainingDays) return current
            return [...current, day].sort((a, b) => a - b)
        })
    }

    function save() {
        if (selected.length !== requiredTrainingDays) {
            setError(`Elegí ${requiredTrainingDays} ${requiredTrainingDays === 1 ? 'día' : 'días'}.`)
            return
        }

        startTransition(async () => {
            const result = await saveActiveTrainingWeekdays(selected)
            if (!result.ok) {
                setError(result.error ?? 'No pudimos guardar los días.')
                return
            }
            onCancel?.()
            router.refresh()
        })
    }

    return (
        <section className="rounded-2xl border border-primary/25 bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                    <h2 className="text-base font-black text-foreground">¿Qué días preferís entrenar?</h2>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        Elegí {requiredTrainingDays}. Así vas a ver tu rutina en un calendario real.
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7" role="group" aria-label="Días para entrenar">
                {WEEKDAYS.map((option) => {
                    const active = selected.includes(option.value)
                    return (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggle(option.value)}
                            className={`min-h-12 rounded-xl border px-2 text-sm font-bold transition active:scale-[0.98] ${active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground'
                                }`}
                        >
                            {option.short}
                        </button>
                    )
                })}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">{selected.length} de {requiredTrainingDays} seleccionados</p>
            {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-400">{error}</p>}

            <div className="mt-4 flex gap-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="h-12 flex-1 rounded-xl border border-border bg-secondary px-4 text-sm font-bold text-foreground">
                        Cancelar
                    </button>
                )}
                <button
                    type="button"
                    disabled={pending || selected.length !== requiredTrainingDays}
                    onClick={save}
                    className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-45"
                >
                    {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {pending ? 'Guardando…' : 'Guardar mis días'}
                </button>
            </div>
        </section>
    )
}

function DayDetail({ day, week, view }: { day: RoutinePlannerDay; week: RoutinePlannerWeek; view: PlannerView }) {
    const totalSets = day.exercises.reduce((sum, exercise) => sum + exercise.sets, 0)
    const trainHref = `/app/train?${week.monthId ? `month=${week.monthId}&` : ''}week=${week.id}&day=${day.id}&view=${view}`
    const dateHeading = day.scheduledDate ? formatSpanishLongDateLabel(day.scheduledDate) : `Entrenamiento ${day.dayIndex}`

    return (
        <article className={`overflow-hidden rounded-2xl border bg-card shadow-sm ${day.status === 'completed'
            ? 'border-emerald-500/30'
            : day.status === 'incomplete'
                ? 'border-amber-500/35'
                : day.status === 'in_progress'
                    ? 'border-primary/45'
                    : 'border-border'
            }`}>
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.1em] text-primary">
                            {dateHeading} · Entrenamiento {day.dayIndex}
                        </p>
                        <h2 className="mt-1.5 text-xl font-black leading-6 text-foreground">{day.name || `Día ${day.dayIndex}`}</h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">{day.exercises.length} ejercicios · {totalSets} series</p>
                        {day.status === 'incomplete' && (
                            <p className="mt-2 text-xs font-bold text-amber-400">
                                Series pendientes · todavía no cuenta como completado
                            </p>
                        )}
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${day.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : day.status === 'incomplete'
                            ? 'bg-amber-500/10 text-amber-400'
                            : day.status === 'in_progress'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                        }`}>
                        <TrainingDayIcon status={day.status} />
                        {statusLabel(day.status)}
                    </span>
                </div>

                <div className="mt-4 space-y-2">
                    {day.exercises.slice(0, 3).map((exercise, index) => (
                        <div key={`${exercise.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-muted/45 px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">{index + 1}</span>
                                <p className="truncate text-sm font-bold text-foreground">{exercise.name}</p>
                            </div>
                            <p className="shrink-0 text-xs font-medium text-muted-foreground">{exercise.sets} × {exercise.reps ?? '—'}</p>
                        </div>
                    ))}
                    {day.exercises.length > 3 && (
                        <p className="px-1 pt-0.5 text-xs font-semibold text-muted-foreground">
                            + {day.exercises.length - 3} {day.exercises.length === 4 ? 'ejercicio más' : 'ejercicios más'}
                        </p>
                    )}
                </div>

                <Link
                    href={trainHref}
                    prefetch
                    className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black transition active:scale-[0.99] ${day.status === 'completed'
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'bg-primary text-primary-foreground'
                        }`}
                >
                    {day.status !== 'completed' && <Dumbbell className="h-4 w-4" aria-hidden="true" />}
                    {ctaLabel(day.status)}
                </Link>
            </div>
        </article>
    )
}

export default function StudentRoutinePlanner({
    routineName,
    weeks,
    totalProgramWeeks,
    initialWeekId,
    initialDayId,
    initialView,
    today,
    trainingWeekdays,
    preferredWeekdays,
    requiredTrainingDays,
}: Props) {
    const configured = Boolean(trainingWeekdays && trainingWeekdays.length >= requiredTrainingDays && requiredTrainingDays > 0)
    const firstWeekId = weeks.find((week) => week.id === initialWeekId)?.id
        ?? weeks.find((week) => week.isCurrent)?.id
        ?? weeks[0]?.id
        ?? ''
    const [view, setView] = useState<PlannerView>(initialView)
    const [selectedWeekId, setSelectedWeekId] = useState(firstWeekId)
    const initialWeek = weeks.find((week) => week.id === firstWeekId)
    const [selectedDayId, setSelectedDayId] = useState<string | null>(() => chooseInitialDay(initialWeek, initialDayId, today))
    const [visibleMonth, setVisibleMonth] = useState(monthKey(initialWeek?.weekStart) || monthKey(today))
    const [editingSchedule, setEditingSchedule] = useState(false)

    const selectedWeekIndex = Math.max(0, weeks.findIndex((week) => week.id === selectedWeekId))
    const selectedWeek = weeks[selectedWeekIndex]
    const selectedDay = selectedWeek?.days.find((day) => day.id === selectedDayId) ?? selectedWeek?.days[0] ?? null
    const completedCount = selectedWeek?.days.filter((day) => day.status === 'completed').length ?? 0
    const weekTotal = selectedWeek?.days.length ?? 0
    const progressPercent = weekTotal > 0 ? Math.round((completedCount / weekTotal) * 100) : 0

    const allScheduledDays = useMemo(() => weeks.flatMap((week) => week.days
        .filter((day) => day.scheduledDate)
        .map((day) => ({ day, week }))), [weeks])
    const scheduledByDate = useMemo(() => new Map(
        allScheduledDays.map((entry) => [entry.day.scheduledDate as string, entry])
    ), [allScheduledDays])
    const monthCells = useMemo(() => buildMondayFirstMonthGrid(`${visibleMonth}-01`).weeks.flat(), [visibleMonth])
    const programMonthKeys = useMemo(() => Array.from(new Set(
        weeks.flatMap((week) => [monthKey(week.weekStart), monthKey(week.weekEnd)]).filter(Boolean)
    )).sort(), [weeks])

    useEffect(() => {
        if (!selectedWeek) return
        const params = new URLSearchParams(window.location.search)
        params.set('week', selectedWeek.id)
        if (selectedWeek.monthId) params.set('month', selectedWeek.monthId)
        else params.delete('month')
        params.set('view', view)
        if (selectedDayId) params.set('day', selectedDayId)
        else params.delete('day')
        window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params.toString()}`)
    }, [selectedDayId, selectedWeek, view])

    function selectWeek(index: number) {
        const next = weeks[index]
        if (!next) return
        setSelectedWeekId(next.id)
        setSelectedDayId(chooseInitialDay(next, null, today))
        if (next.weekStart) setVisibleMonth(monthKey(next.weekStart))
    }

    function selectScheduledDate(date: string) {
        const entry = scheduledByDate.get(date)
        if (!entry) return
        setSelectedWeekId(entry.week.id)
        setSelectedDayId(entry.day.id)
    }

    function moveMonth(delta: number) {
        const [year, month] = visibleMonth.split('-').map(Number)
        const next = new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7)
        if (programMonthKeys.length > 0 && (next < programMonthKeys[0] || next > programMonthKeys[programMonthKeys.length - 1])) return
        setVisibleMonth(next)
    }

    const nextTraining = allScheduledDays
        .filter((entry) => entry.day.scheduledDate && entry.day.scheduledDate > (selectedDay?.scheduledDate ?? today))
        .sort((a, b) => (a.day.scheduledDate ?? '').localeCompare(b.day.scheduledDate ?? ''))[0]

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">Rutina</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {routineName}{selectedWeek ? ` · Semana ${selectedWeek.programWeekNumber} de ${totalProgramWeeks}` : ''}
                </p>
            </div>

            {!configured ? (
                <>
                    <TrainingWeekdayEditor requiredTrainingDays={requiredTrainingDays} initialWeekdays={(preferredWeekdays ?? []).slice(0, requiredTrainingDays)} />
                    {selectedWeek && selectedWeek.days.length > 0 && (
                        <section className="rounded-2xl border border-border bg-card p-4">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tu plan</p>
                            <div className="mt-3 space-y-2">
                                {selectedWeek.days.map((day) => (
                                    <div key={day.id} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">{day.dayIndex}</span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-foreground">{day.name || `Entrenamiento ${day.dayIndex}`}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{day.exercises.length} ejercicios</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            ) : editingSchedule ? (
                <TrainingWeekdayEditor requiredTrainingDays={requiredTrainingDays} initialWeekdays={trainingWeekdays ?? []} onCancel={() => setEditingSchedule(false)} />
            ) : (
                <>
                    <div className="grid grid-cols-2 rounded-xl border border-border bg-card p-1" aria-label="Vista de rutina">
                        <button type="button" onClick={() => setView('week')} className={`h-11 rounded-lg text-sm font-black transition ${view === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Semana</button>
                        <button type="button" onClick={() => setView('month')} className={`h-11 rounded-lg text-sm font-black transition ${view === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Mes</button>
                    </div>

                    {view === 'week' && selectedWeek ? (
                        <>
                            <section className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-base font-black text-foreground">{completedCount === weekTotal && weekTotal > 0 ? 'Semana completada ✓' : 'Esta semana'}</p>
                                        <p className="mt-0.5 text-sm text-muted-foreground">{completedCount} de {weekTotal} entrenamientos</p>
                                    </div>
                                    <span className={`text-lg font-black ${progressPercent === 100 ? 'text-emerald-400' : 'text-primary'}`}>{progressPercent}%</span>
                                </div>
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                                    <div className={`h-full rounded-full ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progressPercent}%` }} />
                                </div>
                            </section>

                            <section className="rounded-2xl border border-border bg-card p-3">
                                <div className="flex items-center justify-between gap-2 px-1">
                                    <button type="button" aria-label="Semana anterior" disabled={selectedWeekIndex === 0} onClick={() => selectWeek(selectedWeekIndex - 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-foreground disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-foreground">{selectedWeek.weekStart && selectedWeek.weekEnd ? formatSpanishWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd) : selectedWeek.name}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">Semana {selectedWeek.programWeekNumber} de {totalProgramWeeks}</p>
                                    </div>
                                    <button type="button" aria-label="Semana siguiente" disabled={selectedWeekIndex >= weeks.length - 1} onClick={() => selectWeek(selectedWeekIndex + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-foreground disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
                                </div>

                                {selectedWeek.weekStart && selectedWeek.weekEnd && (
                                    <div className="mt-3 grid grid-cols-7 gap-1">
                                        {enumerateDateRange(selectedWeek.weekStart, selectedWeek.weekEnd).map((date) => {
                                            const entry = scheduledByDate.get(date)
                                            const active = entry?.day.id === selectedDayId
                                            const isToday = date === today
                                            const weekday = WEEKDAYS.find((option) => option.value === getIsoWeekday(date))
                                            return entry ? (
                                                <button
                                                    key={date}
                                                    type="button"
                                                    onClick={() => selectScheduledDate(date)}
                                                    aria-label={`${weekday?.label} ${Number(date.slice(8))}, ${statusLabel(entry.day.status)}`}
                                                    className={`flex min-h-[64px] min-w-0 flex-col items-center justify-center rounded-xl border px-0.5 transition ${active
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : entry.day.status === 'completed'
                                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                                            : entry.day.status === 'incomplete'
                                                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                                                : 'border-primary/25 bg-primary/[0.06] text-foreground'
                                                        }`}
                                                >
                                                    <span className="text-[10px] font-bold uppercase">{weekday?.short}</span>
                                                    <span className="mt-0.5 text-base font-black">{Number(date.slice(8))}</span>
                                                    <span className="mt-0.5"><TrainingDayIcon status={entry.day.status} /></span>
                                                </button>
                                            ) : (
                                                <div key={date} aria-label={`${weekday?.label} ${Number(date.slice(8))}, descanso${isToday ? ', hoy' : ''}`} className={`flex min-h-[64px] min-w-0 flex-col items-center justify-center rounded-xl border border-transparent text-muted-foreground ${isToday ? 'bg-muted/70 ring-1 ring-primary/40' : 'bg-muted/25'}`}>
                                                    <span className="text-[10px] font-bold uppercase">{weekday?.short}</span>
                                                    <span className="mt-0.5 text-base font-black">{Number(date.slice(8))}</span>
                                                    <span className="mt-1 text-[8px] font-bold">Libre</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {!selectedWeek.isCurrent && weeks.some((week) => week.isCurrent) && (
                                    <button type="button" onClick={() => selectWeek(weeks.findIndex((week) => week.isCurrent))} className="mt-3 w-full text-center text-xs font-bold text-primary">Volver a la semana actual</button>
                                )}
                            </section>

                            {selectedDay && <DayDetail day={selectedDay} week={selectedWeek} view={view} />}
                        </>
                    ) : view === 'month' ? (
                        <>
                            <section className="rounded-2xl border border-border bg-card p-3.5">
                                <div className="flex items-center justify-between gap-2">
                                    <button type="button" aria-label="Mes anterior" onClick={() => moveMonth(-1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background"><ChevronLeft className="h-5 w-5" /></button>
                                    <p className="text-base font-black text-foreground">{formatSpanishMonthLabel(`${visibleMonth}-01`)}</p>
                                    <button type="button" aria-label="Mes siguiente" onClick={() => moveMonth(1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background"><ChevronRight className="h-5 w-5" /></button>
                                </div>
                                <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                                    {WEEKDAYS.map((option) => <span key={option.value} className="py-1 text-[10px] font-black uppercase text-muted-foreground">{option.short}</span>)}
                                    {monthCells.map((cell) => {
                                        const entry = scheduledByDate.get(cell.date)
                                        const active = entry?.day.id === selectedDayId
                                        const isToday = cell.date === today
                                        return (
                                            <button
                                                key={cell.date}
                                                type="button"
                                                disabled={!entry}
                                                onClick={() => entry && selectScheduledDate(cell.date)}
                                                aria-label={entry ? `${formatSpanishLongDateLabel(cell.date)}, ${statusLabel(entry.day.status)}` : formatSpanishLongDateLabel(cell.date)}
                                                className={`relative flex min-h-11 items-center justify-center rounded-xl border text-sm font-bold ${!cell.isCurrentMonth
                                                    ? 'border-transparent text-muted-foreground/25'
                                                    : active
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : entry?.day.status === 'completed'
                                                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                                                            : entry?.day.status === 'incomplete'
                                                                ? 'border-amber-500/25 bg-amber-500/10 text-amber-400'
                                                                : entry
                                                                    ? 'border-primary/20 bg-primary/[0.06] text-foreground'
                                                                    : isToday
                                                                        ? 'border-primary/40 bg-muted/50 text-foreground'
                                                                        : 'border-transparent text-muted-foreground'
                                                    }`}
                                            >
                                                {cell.dayNumber}
                                                {entry && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${active ? 'bg-primary-foreground' : entry.day.status === 'completed' ? 'bg-emerald-400' : entry.day.status === 'incomplete' ? 'bg-amber-400' : 'bg-primary'}`} />}
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border pt-3 text-[10px] font-bold text-muted-foreground">
                                    <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" /> Completado</span>
                                    <span className="inline-flex items-center gap-1"><Circle className="h-2 w-2 fill-primary text-primary" /> Programado</span>
                                    <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-400" /> Pendiente</span>
                                </div>
                            </section>

                            {selectedDay && selectedWeek && <DayDetail day={selectedDay} week={selectedWeek} view={view} />}
                        </>
                    ) : null}

                    {nextTraining?.day.scheduledDate && (
                        <p className="rounded-xl border border-border bg-card/60 px-3 py-2.5 text-sm text-muted-foreground">
                            <span className="font-bold text-foreground">Próximo:</span> {nextTraining.day.name} · {formatSpanishLongDateLabel(nextTraining.day.scheduledDate)}
                        </p>
                    )}

                    <button type="button" onClick={() => setEditingSchedule(true)} className="mx-auto flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-muted-foreground">
                        <Settings2 className="h-4 w-4" aria-hidden="true" />
                        Cambiar días de entrenamiento
                    </button>
                </>
            )}
        </div>
    )
}
