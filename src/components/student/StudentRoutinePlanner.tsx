'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    AlertTriangle,
    CalendarDays,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Circle,
    Dumbbell,
    Loader2,
    Settings2,
} from 'lucide-react'
import { saveActiveTrainingWeekdays } from '@/app/app/rutina/actions'
import {
    buildMondayFirstMonthGrid,
    formatSpanishLongDateLabel,
    formatSpanishMonthLabel,
    formatSpanishWeekRange,
    type IsoWeekday,
} from '@/lib/routineCalendar'
import { NotebookRowText, StudentNotebookHeader, notebookRow, notebookSectionTitle } from './StudentNotebook'

export type RoutinePlannerStatus = 'pending' | 'in_progress' | 'partial' | 'completed'

export type RoutinePlannerExercise = {
    name: string
    sets: number
    target: string | null
}

export type RoutinePlannerDay = {
    id: string
    name: string
    dayIndex: number
    status: RoutinePlannerStatus
    sessionId: string | null
    canStart: boolean
    isToday: boolean
    blockedReason: string | null
    exercises: RoutinePlannerExercise[]
}

export type RoutinePlannerScheduledDate = {
    date: string
    status: RoutinePlannerStatus
    dayId: string | null
    suggested: boolean
}

export type RoutinePlannerWeek = {
    id: string
    monthId: string | null
    name: string
    programWeekNumber: number
    weekStart: string | null
    weekEnd: string | null
    isCurrent: boolean
    scheduledDates: RoutinePlannerScheduledDate[]
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

function chooseInitialDay(week: RoutinePlannerWeek | undefined, requestedDayId: string | null) {
    if (!week) return null
    const requested = week.days.find((day) => day.id === requestedDayId)
    if (requested) return requested.id

    return week.days.find((day) => day.isToday)?.id ?? null
}

function monthKey(date: string | null | undefined) {
    return date?.slice(0, 7) ?? ''
}

function statusLabel(status: RoutinePlannerStatus) {
    if (status === 'completed') return 'Completado'
    if (status === 'in_progress') return 'En curso'
    if (status === 'partial') return 'Incompleto'
    return 'Programado'
}

function ctaLabel(status: RoutinePlannerStatus) {
    if (status === 'completed') return 'Revisar / editar'
    if (status === 'in_progress') return 'Continuar →'
    if (status === 'partial') return 'Completar pendientes →'
    return 'Entrenar →'
}

function buildTrainHref(day: RoutinePlannerDay, week: RoutinePlannerWeek, view: PlannerView) {
    const scheduleQuery = `${week.monthId ? `month=${week.monthId}&` : ''}week=${week.id}&day=${day.id}&view=${view}`
    return day.sessionId && (day.status === 'partial' || day.status === 'completed')
        ? `/app/train?session=${day.sessionId}&source=routine&${scheduleQuery}`
        : `/app/train?${scheduleQuery}`
}

function TrainingAction({
    day,
    week,
    view,
    className,
}: {
    day: RoutinePlannerDay
    week: RoutinePlannerWeek
    view: PlannerView
    className: string
}) {
    const completed = day.status === 'completed'
    const partialReview = day.status === 'partial' && Boolean(day.sessionId)
    const reviewable = completed || partialReview

    if (!reviewable && !day.canStart) {
        return (
            <div
                role="status"
                className={`${className} cursor-not-allowed border border-border bg-muted/45 text-muted-foreground`}
            >
                {day.blockedReason ?? 'No disponible'}
            </div>
        )
    }

    return (
        <Link
            href={buildTrainHref(day, week, view)}
            prefetch={false}
            className={`${className} ${completed
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : partialReview
                    ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'bg-primary text-primary-foreground'
                }`}
        >
            {partialReview
                ? <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                : !reviewable && <Dumbbell className="h-4 w-4" aria-hidden="true" />}
            {ctaLabel(day.status)}
        </Link>
    )
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
        <section className="border-y border-border py-4">
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

function WeekDayListItem({
    day, week, view, open, onToggle,
}: {
    day: RoutinePlannerDay
    week: RoutinePlannerWeek
    view: PlannerView
    open: boolean
    onToggle: () => void
}) {
    const title = day.name.replace(/\s*\|\s*/g, ' · ')
    const status = day.isToday && day.status === 'pending' ? 'Te toca hoy' : statusLabel(day.status)
    const detailId = `planner-day-${day.id}`

    return (
        <article>
            <button type="button" className={notebookRow} aria-expanded={open} aria-controls={detailId} onClick={onToggle}>
                {day.status === 'completed'
                    ? <Check className="size-4 shrink-0 text-brand-soft" aria-hidden="true" />
                    : <Dumbbell className="size-4 shrink-0 text-brand-soft" aria-hidden="true" />}
                <NotebookRowText title={title} subtitle={`${status} · ${day.exercises.length} ${day.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}`} />
                <ChevronDown className={`size-4 shrink-0 text-muted-foreground ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <div id={detailId} hidden={!open} className="space-y-3 pb-3 pl-7">
                {open && (
                    <>
                        <ul className="divide-y divide-border border-y border-border">
                            {day.exercises.map((exercise, index) => (
                                <li key={index} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 py-2 text-sm">
                                    <span className="min-w-0 [overflow-wrap:anywhere]">{exercise.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {exercise.target ? `${exercise.sets} × ${exercise.target}` : `${exercise.sets} ${exercise.sets === 1 ? 'serie' : 'series'}`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <TrainingAction day={day} week={week} view={view} className="flex min-h-11 w-fit max-w-full flex-wrap items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
                    </>
                )}
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
    const firstWeek = weeks.find((week) => week.id === initialWeekId)
        ?? weeks.find((week) => week.isCurrent)
        ?? weeks[0]
    const [view, setView] = useState<PlannerView>(initialView)
    const [selectedWeekId, setSelectedWeekId] = useState(firstWeek?.id ?? '')
    const [weekOpen, setWeekOpen] = useState(true)
    const [selectedDayId, setSelectedDayId] = useState(() => chooseInitialDay(firstWeek, initialDayId))
    const [selectedScheduleDate, setSelectedScheduleDate] = useState(() => (
        firstWeek?.scheduledDates.find((slot) => initialDayId && slot.dayId === initialDayId)?.date
        ?? (firstWeek?.isCurrent ? today : firstWeek?.scheduledDates[0]?.date ?? firstWeek?.weekStart ?? today)
    ))
    const [visibleMonth, setVisibleMonth] = useState(() => monthKey(selectedScheduleDate))
    const [editingSchedule, setEditingSchedule] = useState(false)

    const selectedWeek = weeks.find((week) => week.id === selectedWeekId)
    const allScheduledDates = useMemo(() => weeks.flatMap((week) => week.scheduledDates.map((slot) => ({ slot, week }))), [weeks])
    const scheduledByDate = useMemo(() => new Map(allScheduledDates.map((entry) => [entry.slot.date, entry])), [allScheduledDates])
    const monthCells = useMemo(() => buildMondayFirstMonthGrid(`${visibleMonth}-01`).weeks.flat(), [visibleMonth])
    const programMonthKeys = useMemo(() => Array.from(new Set(
        weeks.flatMap((week) => [monthKey(week.weekStart), monthKey(week.weekEnd)]).filter(Boolean)
    )).sort(), [weeks])
    const calendarEntry = scheduledByDate.get(selectedScheduleDate)
    const calendarDay = calendarEntry?.week.days.find((day) => day.id === calendarEntry.slot.dayId)

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

    function selectWeek(week: RoutinePlannerWeek) {
        if (week.id === selectedWeekId) {
            setWeekOpen((open) => !open)
            return
        }
        setSelectedWeekId(week.id)
        setWeekOpen(true)
        setSelectedDayId(chooseInitialDay(week, null))
        const date = week.isCurrent ? today : week.scheduledDates[0]?.date ?? week.weekStart ?? today
        setSelectedScheduleDate(date)
        setVisibleMonth(monthKey(date))
    }

    function selectScheduledDate(date: string) {
        setSelectedScheduleDate(date)
        const entry = scheduledByDate.get(date)
        if (!entry) return
        setSelectedWeekId(entry.week.id)
        setSelectedDayId(entry.slot.dayId)
        setWeekOpen(true)
    }

    function moveMonth(delta: number) {
        const [year, month] = visibleMonth.split('-').map(Number)
        const next = new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7)
        if (programMonthKeys.length > 0 && (next < programMonthKeys[0] || next > programMonthKeys[programMonthKeys.length - 1])) return
        setVisibleMonth(next)
        const upcoming = allScheduledDates.find(({ slot }) => monthKey(slot.date) === next)
        selectScheduledDate(upcoming?.slot.date ?? `${next}-01`)
    }

    return (
        <div className="space-y-5">
            <StudentNotebookHeader title="Mi programa" section="Rutina" subtitle={`${routineName} · ${totalProgramWeeks} ${totalProgramWeeks === 1 ? 'semana' : 'semanas'}`} />

            <div className="flex flex-wrap items-center gap-x-5 border-b border-border">
                <button
                    type="button" onClick={() => setView('week')} aria-pressed={view === 'week'}
                    className={`min-h-11 border-b-2 text-sm font-semibold ${view === 'week' ? 'border-primary text-brand-soft' : 'border-transparent text-muted-foreground'}`}
                >
                    Semanas
                </button>
                <button
                    type="button" onClick={() => setView('month')} aria-pressed={view === 'month'}
                    aria-label="Ver calendario mensual"
                    className={`inline-flex min-h-11 items-center gap-2 border-b-2 text-sm font-semibold ${view === 'month' ? 'border-primary text-brand-soft' : 'border-transparent text-muted-foreground'}`}
                >
                    <CalendarDays className="size-4" aria-hidden="true" /> Calendario
                </button>
            </div>

            {view === 'week' ? (
                <ol className="relative before:absolute before:bottom-5 before:left-3.5 before:top-5 before:w-px before:bg-border">
                    {weeks.map((week) => {
                        const open = week.id === selectedWeekId && weekOpen
                        const completed = week.days.filter((day) => day.status === 'completed').length
                        const complete = week.days.length > 0 && completed === week.days.length
                        const dates = week.weekStart && week.weekEnd ? formatSpanishWeekRange(week.weekStart, week.weekEnd) : null
                        const label = [dates, week.isCurrent ? 'Semana actual' : null].filter(Boolean).join(' · ')
                        return (
                            <li key={week.id} className="relative">
                                <h2>
                                    <button type="button" onClick={() => selectWeek(week)} aria-expanded={open} aria-controls={`planner-week-${week.id}`}
                                        className={`flex min-h-14 w-full min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${open ? 'text-brand-soft' : 'text-foreground'}`}>
                                        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${week.isCurrent ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`} aria-hidden="true">
                                            {complete ? <Check className="size-3.5" /> : week.programWeekNumber}
                                        </span>
                                        <NotebookRowText title={week.name} subtitle={label || undefined} />
                                        <ChevronDown className={`size-4 shrink-0 text-muted-foreground ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                                    </button>
                                </h2>
                                <div id={`planner-week-${week.id}`} hidden={!open} className="pb-3 pl-10">
                                    {open && (
                                        <>
                                            <div className="border-t border-border py-2 text-xs text-muted-foreground">
                                                {complete && <p className="font-semibold text-brand-soft">Semana completada ✓</p>}
                                                <p>{completed} de {week.days.length} entrenamientos</p>
                                            </div>
                                            {week.days.length ? week.days.map((day) => (
                                                <WeekDayListItem key={day.id} day={day} week={week} view={view}
                                                    open={day.id === selectedDayId} onToggle={() => setSelectedDayId((current) => current === day.id ? null : day.id)} />
                                            )) : <p className="py-2 text-sm text-muted-foreground">Todavía no hay entrenamientos en esta semana.</p>}
                                        </>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ol>
            ) : (
                <section className="space-y-4" aria-labelledby="planner-calendar-title">
                    <div className="flex items-center justify-between gap-2">
                        <button type="button" aria-label="Mes anterior" onClick={() => moveMonth(-1)} disabled={programMonthKeys.length > 0 && visibleMonth <= programMonthKeys[0]}
                            className="grid size-11 place-items-center rounded-full border border-border disabled:opacity-35">
                            <ChevronLeft className="size-5" aria-hidden="true" />
                        </button>
                        <h2 id="planner-calendar-title" className={notebookSectionTitle}>{formatSpanishMonthLabel(`${visibleMonth}-01`)}</h2>
                        <button type="button" aria-label="Mes siguiente" onClick={() => moveMonth(1)} disabled={programMonthKeys.length > 0 && visibleMonth >= programMonthKeys[programMonthKeys.length - 1]}
                            className="grid size-11 place-items-center rounded-full border border-border disabled:opacity-35">
                            <ChevronRight className="size-5" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 text-center">
                        {WEEKDAYS.map((option) => <span key={option.value} className="pb-2 text-xs text-muted-foreground">{option.short}</span>)}
                        {monthCells.map((cell) => {
                            const entry = scheduledByDate.get(cell.date)
                            const active = selectedScheduleDate === cell.date
                            return (
                                <button
                                    key={cell.date} type="button" onClick={() => selectScheduledDate(cell.date)}
                                    aria-current={cell.date === today ? 'date' : undefined}
                                    aria-pressed={active}
                                    aria-label={`${formatSpanishLongDateLabel(cell.date)}${entry ? `, ${statusLabel(entry.slot.status)}` : ''}`}
                                    className={`relative flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold ${active
                                        ? 'bg-primary text-primary-foreground'
                                        : cell.date === today ? 'text-brand-soft' : cell.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/60'}`}
                                >
                                    {cell.dayNumber}
                                    {entry && (
                                        <span aria-hidden="true" className={`absolute bottom-1 size-1.5 ${entry.slot.status === 'completed' ? 'rotate-45' : 'rounded-full'} ${active ? 'bg-primary-foreground' : 'bg-primary'}`} />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2"><span className="size-1.5 rotate-45 bg-primary" aria-hidden="true" />Completado</span>
                        <span className="inline-flex items-center gap-2"><Circle className="size-1.5 fill-primary text-primary" aria-hidden="true" />Programado o en curso</span>
                    </div>
                    <div className="space-y-2 border-t border-border pt-3">
                        <h3 className="text-sm font-semibold capitalize">{formatSpanishLongDateLabel(selectedScheduleDate)}</h3>
                        {calendarEntry && calendarDay ? (
                            <WeekDayListItem day={calendarDay} week={calendarEntry.week} view={view} open={selectedDayId === calendarDay.id}
                                onToggle={() => setSelectedDayId((current) => current === calendarDay.id ? null : calendarDay.id)} />
                        ) : <p className="text-sm text-muted-foreground">No hay un entrenamiento asignado a esta fecha.</p>}
                    </div>
                </section>
            )}

            <div className="border-t border-border">
                {editingSchedule ? (
                    <TrainingWeekdayEditor
                        key={`${configured}-${(trainingWeekdays ?? []).join('-')}`}
                        requiredTrainingDays={requiredTrainingDays}
                        initialWeekdays={configured ? trainingWeekdays ?? [] : (preferredWeekdays ?? trainingWeekdays ?? []).slice(0, requiredTrainingDays)}
                        onCancel={() => setEditingSchedule(false)}
                    />
                ) : (
                    <button type="button" onClick={() => setEditingSchedule(true)} className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-brand-soft">
                        <Settings2 className="size-4" aria-hidden="true" />{configured ? 'Cambiar días de entrenamiento' : 'Configurar mis días de entrenamiento'}
                    </button>
                )}
            </div>
        </div>
    )
}
