'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    CalendarRange,
    Check,
    Copy,
    Loader2,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react'

type Month = { id: string; month_number: number; name: string | null }
type Week = { id: string; week_number: number; name: string | null; routine_month_id: string | null }

type Props = {
    routineId: string
    months: Month[]
    weeks: Week[]
    selectedMonthId: string | null
    selectedWeekId: string | null
    addRoutineMonth: (formData: FormData) => Promise<void>
    addRoutineWeek: (formData: FormData) => Promise<{ ok: boolean; newWeekId?: string; error?: string }>
    duplicateRoutineWeek: (formData: FormData) => Promise<void>
    deleteRoutineWeek: (formData: FormData) => Promise<void>
    deleteRoutineMonth: (formData: FormData) => Promise<void>
    renameRoutineMonth: (formData: FormData) => Promise<void>
    renameRoutineWeek: (formData: FormData) => Promise<void>
}

function plannerUrl(
    routineId: string,
    values: { month?: string | null; week?: string | null; day?: string | null }
) {
    const params = new URLSearchParams()
    if (values.month) params.set('month', values.month)
    if (values.week) params.set('week', values.week)
    if (values.day) params.set('day', values.day)
    const query = params.toString()
    return `/dashboard/routines/${routineId}${query ? `?${query}` : ''}`
}

export default function WeekMonthSelector({
    routineId,
    months,
    weeks,
    selectedMonthId,
    selectedWeekId,
    addRoutineMonth,
    addRoutineWeek,
    duplicateRoutineWeek,
    deleteRoutineWeek,
    deleteRoutineMonth,
    renameRoutineMonth,
    renameRoutineWeek,
}: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dayId = searchParams.get('day')
    const [isPending, startTransition] = React.useTransition()
    const [editingMonth, setEditingMonth] = React.useState(false)
    const [editingWeek, setEditingWeek] = React.useState(false)
    const [confirmDeleteMonth, setConfirmDeleteMonth] = React.useState(false)
    const [confirmDeleteWeek, setConfirmDeleteWeek] = React.useState(false)
    const [showMobileWeekActions, setShowMobileWeekActions] = React.useState(false)
    const [monthName, setMonthName] = React.useState('')
    const [weekName, setWeekName] = React.useState('')
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

    const selectedMonth = months.find((month) => month.id === selectedMonthId) ?? months[0] ?? null
    const weeksForMonth = selectedMonth
        ? weeks.filter((week) => week.routine_month_id === selectedMonth.id)
        : weeks
    const selectedWeek = weeksForMonth.find((week) => week.id === selectedWeekId) ?? weeksForMonth[0] ?? null

    React.useEffect(() => {
        setEditingMonth(false)
        setEditingWeek(false)
        setConfirmDeleteMonth(false)
        setConfirmDeleteWeek(false)
        setShowMobileWeekActions(false)
        setErrorMessage(null)
    }, [selectedMonth?.id, selectedWeek?.id])

    function addWeek(formData: FormData) {
        setErrorMessage(null)
        startTransition(async () => {
            try {
                const result = await addRoutineWeek(formData)
                if (!result.ok || !result.newWeekId) {
                    setErrorMessage(result.error ?? 'No se pudo agregar la semana.')
                    return
                }
                router.push(plannerUrl(routineId, {
                    month: selectedMonth?.id,
                    week: result.newWeekId,
                }))
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'No se pudo agregar la semana.')
            }
        })
    }

    function duplicateWeek(formData: FormData) {
        setErrorMessage(null)
        startTransition(async () => {
            try {
                await duplicateRoutineWeek(formData)
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'No se pudo duplicar la semana.')
            }
        })
    }

    return (
        <section
            aria-label="Planificación de la rutina"
            data-testid="planner-navigation"
            className="rounded-xl border border-border bg-card p-3 shadow-sm"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CalendarRange className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-foreground">Planificación</h2>
                        <p className="text-[11px] text-muted-foreground">Mesociclo y semanas</p>
                    </div>
                </div>
                {isPending && <Loader2 className="mt-1 h-4 w-4 animate-spin text-primary" aria-label="Guardando" />}
            </div>

            <div className="mt-3 border-t border-border pt-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="routine-month" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        Mesociclo
                    </label>
                    <div className="flex items-center gap-1">
                        {selectedMonth && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMonthName(selectedMonth.name ?? '')
                                    setEditingMonth(true)
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                                aria-label="Renombrar mesociclo"
                                title="Renombrar mesociclo"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <form action={addRoutineMonth}>
                            <input type="hidden" name="routineId" value={routineId} />
                            <button
                                type="submit"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                                aria-label="Agregar mesociclo"
                                title="Agregar mesociclo"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </form>
                        {months.length > 1 && selectedMonth && (
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteMonth(true)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                                aria-label="Eliminar mesociclo"
                                title="Eliminar mesociclo"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {editingMonth && selectedMonth ? (
                    <form action={renameRoutineMonth} className="flex gap-1.5" onSubmit={() => setEditingMonth(false)}>
                        <input type="hidden" name="routineId" value={routineId} />
                        <input type="hidden" name="monthId" value={selectedMonth.id} />
                        {selectedWeek?.id && <input type="hidden" name="weekId" value={selectedWeek.id} />}
                        {dayId && <input type="hidden" name="dayId" value={dayId} />}
                        <input
                            autoFocus
                            name="name"
                            value={monthName}
                            onChange={(event) => setMonthName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') setEditingMonth(false)
                            }}
                            placeholder={`Mesociclo ${selectedMonth.month_number}`}
                            className="h-10 min-w-0 flex-1 rounded-lg border border-primary bg-background px-3 text-sm text-foreground outline-none"
                        />
                        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-label="Guardar nombre del mesociclo">
                            <Check className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setEditingMonth(false)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground" aria-label="Cancelar edición del mesociclo">
                            <X className="h-4 w-4" />
                        </button>
                    </form>
                ) : months.length > 0 ? (
                    <select
                        id="routine-month"
                        value={selectedMonth?.id ?? ''}
                        onChange={(event) => router.push(plannerUrl(routineId, { month: event.target.value }))}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary"
                    >
                        {months.map((month) => (
                            <option key={month.id} value={month.id}>
                                {month.name?.trim() || `Mesociclo ${month.month_number}`}
                            </option>
                        ))}
                    </select>
                ) : (
                    <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                        Plan base sin mesociclos.
                    </p>
                )}

                {confirmDeleteMonth && selectedMonth && (
                    <div className="mt-2 rounded-lg border border-red-500/25 bg-red-500/5 p-2.5">
                        <p className="text-xs text-foreground">¿Eliminar este mesociclo y sus semanas?</p>
                        <div className="mt-2 flex gap-2">
                            <form action={deleteRoutineMonth}>
                                <input type="hidden" name="routineId" value={routineId} />
                                <input type="hidden" name="monthId" value={selectedMonth.id} />
                                <button type="submit" className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Eliminar</button>
                            </form>
                            <button type="button" onClick={() => setConfirmDeleteMonth(false)} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">Cancelar</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-3 border-t border-border pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Semanas</p>
                    <span className="text-[10px] text-muted-foreground">{weeksForMonth.length} en total</span>
                </div>

                <nav aria-label="Semanas del mesociclo" className="flex snap-x gap-2 overflow-x-auto pb-1 xl:grid xl:max-h-[19rem] xl:grid-cols-1 xl:overflow-y-auto xl:pr-1">
                    {weeksForMonth.map((week) => {
                        const active = week.id === selectedWeek?.id
                        return (
                            <Link
                                key={week.id}
                                href={plannerUrl(routineId, { month: selectedMonth?.id, week: week.id })}
                                aria-current={active ? 'page' : undefined}
                                data-testid={`routine-week-${week.id}`}
                                className={`min-w-[9.5rem] snap-start rounded-lg border px-3 py-2.5 text-left transition xl:min-w-0 ${active
                                    ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/20'
                                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30'
                                    }`}
                            >
                                <span className="block text-xs font-bold">Semana {week.week_number}</span>
                                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                    {week.name?.trim() || (active ? 'Semana seleccionada' : 'Abrir planificación')}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                {editingWeek && selectedWeek ? (
                    <form action={renameRoutineWeek} className="mt-2 flex gap-1.5" onSubmit={() => setEditingWeek(false)}>
                        <input type="hidden" name="routineId" value={routineId} />
                        <input type="hidden" name="weekId" value={selectedWeek.id} />
                        {selectedMonth?.id && <input type="hidden" name="monthId" value={selectedMonth.id} />}
                        {dayId && <input type="hidden" name="dayId" value={dayId} />}
                        <input
                            autoFocus
                            name="name"
                            value={weekName}
                            onChange={(event) => setWeekName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') setEditingWeek(false)
                            }}
                            placeholder={`Nombre opcional de Semana ${selectedWeek.week_number}`}
                            className="h-10 min-w-0 flex-1 rounded-lg border border-primary bg-background px-3 text-sm text-foreground outline-none"
                        />
                        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-label="Guardar nombre de la semana">
                            <Check className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setEditingWeek(false)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground" aria-label="Cancelar edición de la semana">
                            <X className="h-4 w-4" />
                        </button>
                    </form>
                ) : selectedWeek && (
                    <>
                        <button
                            type="button"
                            onClick={() => setShowMobileWeekActions((current) => !current)}
                            className="mt-2 flex h-9 w-full items-center justify-between rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground sm:hidden"
                            aria-expanded={showMobileWeekActions}
                        >
                            Editar o duplicar semana
                            <span aria-hidden="true">{showMobileWeekActions ? '−' : '+'}</span>
                        </button>
                        <div className={`mt-2 grid-cols-3 gap-1.5 ${showMobileWeekActions ? 'grid' : 'hidden'} sm:grid`}>
                        <button
                            type="button"
                            onClick={() => {
                                setWeekName(selectedWeek.name ?? '')
                                setEditingWeek(true)
                            }}
                            className="flex h-9 items-center justify-center gap-1 rounded-lg border border-border text-[11px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                        >
                            <Pencil className="h-3.5 w-3.5" /> Renombrar
                        </button>
                        <form action={duplicateWeek}>
                            <input type="hidden" name="routineId" value={routineId} />
                            <input type="hidden" name="sourceWeekId" value={selectedWeek.id} />
                            {selectedMonth?.id && <input type="hidden" name="monthId" value={selectedMonth.id} />}
                            <button type="submit" disabled={isPending} className="flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-border text-[11px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50">
                                <Copy className="h-3.5 w-3.5" /> Duplicar
                            </button>
                        </form>
                        <button
                            type="button"
                            disabled={weeksForMonth.length <= 1}
                            onClick={() => setConfirmDeleteWeek(true)}
                            className="flex h-9 items-center justify-center gap-1 rounded-lg border border-red-500/20 text-[11px] font-medium text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </button>
                        </div>
                    </>
                )}

                {confirmDeleteWeek && selectedWeek && (
                    <div className="mt-2 rounded-lg border border-red-500/25 bg-red-500/5 p-2.5">
                        <p className="text-xs text-foreground">¿Eliminar Semana {selectedWeek.week_number}?</p>
                        <div className="mt-2 flex gap-2">
                            <form action={deleteRoutineWeek}>
                                <input type="hidden" name="routineId" value={routineId} />
                                <input type="hidden" name="weekId" value={selectedWeek.id} />
                                {selectedMonth?.id && <input type="hidden" name="monthId" value={selectedMonth.id} />}
                                <button type="submit" className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Eliminar</button>
                            </form>
                            <button type="button" onClick={() => setConfirmDeleteWeek(false)} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">Cancelar</button>
                        </div>
                    </div>
                )}

                <form action={addWeek} className="mt-2">
                    <input type="hidden" name="routineId" value={routineId} />
                    {selectedMonth?.id && <input type="hidden" name="monthId" value={selectedMonth.id} />}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/[0.04] text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Nueva semana
                    </button>
                </form>
            </div>

            {errorMessage && <p role="alert" className="mt-2 text-xs font-medium text-red-500">{errorMessage}</p>}
        </section>
    )
}
