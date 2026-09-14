'use client'

import * as React from 'react'
import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type Month = { id: string; month_number: number; name: string | null }
type Week = { id: string; week_number: number; name: string | null; routine_month_id: string | null }

type Props = {
    routineId: string
    months: Month[]
    weeks: Week[]
    selectedMonthId: string | null
    selectedWeekId: string | null
    addRoutineMonth: (formData: FormData) => Promise<void>
    addRoutineWeek: (formData: FormData) => Promise<{ok: boolean, newWeekId?: string, error?: string}>
    duplicateRoutineWeek: (formData: FormData) => Promise<void>
    deleteRoutineWeek: (formData: FormData) => Promise<void>
    deleteRoutineMonth: (formData: FormData) => Promise<void>
    renameRoutineMonth: (formData: FormData) => Promise<void>
    renameRoutineWeek: (formData: FormData) => Promise<void>
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
    const [isPending, startTransition] = useTransition()
    const [editingMonthId, setEditingMonthId] = React.useState<string | null>(null)
    const [confirmDeleteMonthId, setConfirmDeleteMonthId] = React.useState<string | null>(null)
    const [confirmDeleteWeekId, setConfirmDeleteWeekId] = React.useState<string | null>(null)
    const [editingWeekId, setEditingWeekId] = React.useState<string | null>(null)
    const [monthName, setMonthName] = React.useState('')
    const [weekName, setWeekName] = React.useState('')
    const [showHint, setShowHint] = React.useState(false)
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const dayId = searchParams.get('day')

    const lastTap = React.useRef<Record<string, number>>({})

    const selectedMonth = months.find(m => m.id === selectedMonthId) ?? months[0] ?? null
    const weeksForMonth = weeks.filter(w => w.routine_month_id === selectedMonthId)
    const selectedWeek = weeksForMonth.find(w => w.id === selectedWeekId) ?? weeksForMonth[0] ?? null
    const previousWeek = weeksForMonth[weeksForMonth.findIndex(w => w.id === selectedWeekId) - 1] ?? null

    function handleDoubleTap(id: string, callback: () => void) {
        const now = Date.now()
        const last = lastTap.current[id] ?? 0
        if (now - last < 400) {
            callback()
            lastTap.current[id] = 0
        } else {
            lastTap.current[id] = now
        }
    }

    function startEditMonth(month: Month) {
        setEditingMonthId(month.id)
        setMonthName(month.name || '')
        setEditingWeekId(null)
    }

    function startEditWeek(week: Week) {
        setEditingWeekId(week.id)
        setWeekName(week.name || '')
        setEditingMonthId(null)
    }

    return (
        <div className="rounded-xl border border-border bg-card p-2.5">
            {/* Header con hint */}
            <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    Mesociclo
                </p>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowHint(!showHint)}
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-border text-[9px] text-muted-foreground transition hover:text-foreground"
                    >
                        ?
                    </button>
                    {showHint && (
                        <div className="absolute right-0 top-5 z-10 w-44 rounded-xl border border-border bg-card p-2.5 text-[10px] text-muted-foreground shadow-md">
                            Tocá dos veces un mes o semana para cambiarle el nombre.
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs de meses */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {months.map((month) => {
                    const isActive = month.id === selectedMonthId
                    const label = month.name || `Mes ${month.month_number}`
                    const isEditing = editingMonthId === month.id

                    if (isEditing) {
                        return (
                            <form
                                key={month.id}
                                action={renameRoutineMonth}
                                onSubmit={() => setEditingMonthId(null)}
                                className="flex shrink-0 items-center gap-1"
                            >
                                <input type="hidden" name="routineId" value={routineId} />
                                <input type="hidden" name="monthId" value={month.id} />
                                {selectedWeekId && <input type="hidden" name="weekId" value={selectedWeekId} />}
                                {dayId && <input type="hidden" name="dayId" value={dayId} />}
                                <input
                                    autoFocus
                                    type="text"
                                    name="name"
                                    value={monthName}
                                    onChange={e => setMonthName(e.target.value)}
                                    onBlur={() => setEditingMonthId(null)}
                                    onKeyDown={e => e.key === 'Escape' && setEditingMonthId(null)}
                                    placeholder={`Mes ${month.month_number}`}
                                    className="h-7 w-24 rounded-lg border border-indigo-500 bg-background px-2 text-xs text-foreground outline-none"
                                />
                                <button type="submit" className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] text-white">✓</button>
                            </form>
                        )
                    }

                    return (
                        <Link
                            key={month.id}
                            href={`/dashboard/routines/${routineId}?month=${month.id}`}
                            onClick={(e) => {
                                handleDoubleTap(month.id, () => {
                                    e.preventDefault()
                                    startEditMonth(month)
                                })
                            }}
                            title={label}
                            className={`max-w-[9rem] shrink-0 truncate rounded-lg px-2.5 py-1.5 text-xs font-medium transition select-none ${
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                            }`}
                        >
                            {label}
                        </Link>
                    )
                })}

                <form action={addRoutineMonth}>
                    <input type="hidden" name="routineId" value={routineId} />
                    <button type="submit" aria-label="Agregar mesociclo" title="Agregar mesociclo" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground">
                        +
                    </button>
                </form>

                {months.length > 1 && selectedMonth && (
                    confirmDeleteMonthId === selectedMonth.id ? (
                        <div className="flex shrink-0 items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteMonthId(null)}
                                className="rounded-lg border border-border bg-secondary px-2 py-1.5 text-[10px] text-secondary-foreground transition hover:bg-muted"
                            >
                                No
                            </button>
                            <form action={deleteRoutineMonth}>
                                <input type="hidden" name="routineId" value={routineId} />
                                <input type="hidden" name="monthId" value={selectedMonth.id} />
                                <button
                                    type="submit"
                                    className="rounded-lg bg-red-600 px-2 py-1.5 text-[10px] font-medium text-white transition hover:bg-red-500"
                                >
                                    Sí
                                </button>
                            </form>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmDeleteMonthId(selectedMonth.id)}
                            aria-label="Eliminar mesociclo"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-500/20 text-[10px] text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Eliminar mesociclo"
                        >
                            ✕
                        </button>
                    )
                )}
            </div>

            {/* Tabs de semanas — mismo patrón que meses */}
            <div className="border-t border-border pt-1.5">
                <div className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {weeksForMonth.map((week) => {
                        const isActive = week.id === selectedWeekId
                        const label = week.name || `Sem. ${week.week_number}`
                        const isEditing = editingWeekId === week.id

                        if (isEditing) {
                            return (
                                <form
                                    key={week.id}
                                    action={renameRoutineWeek}
                                    onSubmit={() => setEditingWeekId(null)}
                                    className="flex shrink-0 items-center gap-1"
                                >
                                    <input type="hidden" name="routineId" value={routineId} />
                                    <input type="hidden" name="weekId" value={week.id} />
                                    {dayId && <input type="hidden" name="dayId" value={dayId} />}
                                    {selectedMonthId && <input type="hidden" name="monthId" value={selectedMonthId} />}
                                    <input
                                        autoFocus
                                        type="text"
                                        name="name"
                                        value={weekName}
                                        onChange={e => setWeekName(e.target.value)}
                                        onBlur={() => setEditingWeekId(null)}
                                        onKeyDown={e => e.key === 'Escape' && setEditingWeekId(null)}
                                        placeholder={`Sem. ${week.week_number}`}
                                        className="w-20 rounded-lg border border-indigo-500 bg-background px-2 py-1 text-xs text-foreground outline-none"
                                    />
                                    <button type="submit" className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] text-white">✓</button>
                                </form>
                            )
                        }

                        return (
                            <Link
                                key={week.id}
                                title={label}
                                href={`/dashboard/routines/${routineId}?week=${week.id}${selectedMonthId ? `&month=${selectedMonthId}` : ''}`}
                                onClick={(e) => {
                                    handleDoubleTap(week.id, () => {
                                        e.preventDefault()
                                        startEditWeek(week)
                                    })
                                }}
                                className={`max-w-[8rem] shrink-0 truncate rounded-lg px-2.5 py-1.5 text-xs font-medium transition select-none ${
                                    isActive
                                        ? 'bg-secondary text-foreground ring-1 ring-inset ring-indigo-500'
                                        : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                }`}
                            >
                                {label}
                            </Link>
                        )
                    })}

                    <form action={(fd) => {
                        setErrorMsg(null)
                        startTransition(async () => {
                            try {
                                const res = await addRoutineWeek(fd)
                                if (res?.ok === false) {
                                    setErrorMsg(res.error || 'Error al agregar semana')
                                } else if (res?.newWeekId) {
                                    router.push(`/dashboard/routines/${routineId}?week=${res.newWeekId}${selectedMonthId ? `&month=${selectedMonthId}` : ''}`)
                                }
                            } catch (error: unknown) {
                                setErrorMsg(error instanceof Error ? error.message : 'Error inesperado')
                            }
                        })
                    }}>
                        <input type="hidden" name="routineId" value={routineId} />
                        {selectedMonthId && <input type="hidden" name="monthId" value={selectedMonthId} />}
                        <button
                            type="submit"
                            disabled={isPending}
                            aria-label="Agregar semana"
                            title="Agregar semana"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground disabled:opacity-50"
                        >
                            +
                        </button>
                    </form>

                    {weeksForMonth.length > 1 && selectedWeek && (
                        confirmDeleteWeekId === selectedWeek.id ? (
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteWeekId(null)}
                                    className="rounded-lg border border-border bg-secondary px-2 py-1.5 text-[10px] text-secondary-foreground transition hover:bg-muted"
                                >
                                    No
                                </button>
                                <form action={deleteRoutineWeek}>
                                    <input type="hidden" name="routineId" value={routineId} />
                                    <input type="hidden" name="weekId" value={selectedWeek.id} />
                                    {selectedMonthId && <input type="hidden" name="monthId" value={selectedMonthId} />}
                                    <button type="submit" className="rounded-lg bg-red-600 px-2 py-1.5 text-[10px] font-medium text-white transition hover:bg-red-500">
                                        Sí
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <button
                                type="button"
                                aria-label="Eliminar semana seleccionada"
                                title="Eliminar semana seleccionada"
                                onClick={() => setConfirmDeleteWeekId(selectedWeek.id)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-500/20 text-[10px] text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                                ✕
                            </button>
                        )
                    )}
                </div>
            </div>
            {errorMsg && (
                <div className="mt-2 text-xs text-red-500 font-medium">{errorMsg}</div>
            )}

            {selectedWeek && previousWeek && (
                <div className="mt-1.5">
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                            const formData = new FormData()
                            formData.append('routineId', routineId)
                            formData.append('sourceWeekId', previousWeek.id)
                            if (selectedMonthId) formData.append('monthId', selectedMonthId)
                            startTransition(async () => {
                                await duplicateRoutineWeek(formData)
                            })
                        }}
                        className={`w-full rounded-lg border py-1.5 text-[10px] transition ${
                            isPending
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-500 dark:border-indigo-500/30 dark:bg-indigo-500/10 cursor-not-allowed'
                                : 'border-border bg-secondary text-secondary-foreground hover:bg-muted'
                        }`}
                    >
                        {isPending
                            ? 'Creando semana...'
                            : `Crear nueva copiando Sem. ${previousWeek.week_number}`}
                    </button>
                </div>
            )}
        </div>
    )
}
