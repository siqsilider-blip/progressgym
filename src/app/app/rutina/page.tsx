import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
    searchParams?: {
        month?: string
        week?: string
    }
}

export default async function AppRutinePage({ searchParams }: PageProps) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('id', user.id)
        .single()

    const studentId = profile?.student_id
    if (!studentId) redirect('/app')

    const { data: assignment } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', studentId)
        .maybeSingle()

    if (!assignment?.routine_id) {
        return (
            <div className="p-4 pb-24">
                <div className="mx-auto max-w-lg">
                    <h1 className="mb-5 text-2xl font-black text-foreground">Rutina</h1>
                    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                        <p className="text-3xl">📋</p>
                        <p className="mt-3 text-sm font-semibold text-card-foreground">Sin rutina asignada</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Tu entrenador todavía no te asignó una rutina.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const { data: routine } = await supabase
        .from('routines')
        .select('id, name')
        .eq('id', assignment.routine_id)
        .single()

    // Meses
    const { data: months } = await supabase
        .from('routine_months')
        .select('id, month_number, name')
        .eq('routine_id', assignment.routine_id)
        .order('month_number', { ascending: true })

    const selectedMonth = (months ?? []).find(m => m.id === searchParams?.month)
        ?? (months ?? [])[0]
        ?? null

    // Semanas del mes seleccionado
    const { data: weeks } = selectedMonth ? await supabase
        .from('routine_weeks')
        .select('id, week_number, name')
        .eq('routine_month_id', selectedMonth.id)
        .order('week_number', { ascending: true })
        : { data: [] }

    const selectedWeek = (weeks ?? []).find(w => w.id === searchParams?.week)
        ?? (weeks ?? [])[0]
        ?? null

    // Días de la semana seleccionada
    const { data: days } = selectedWeek ? await supabase
        .from('routine_days')
        .select('id, name, day_index')
        .eq('routine_week_id', selectedWeek.id)
        .order('day_index', { ascending: true })
        : { data: [] }

    // Ejercicios por día
    const dayIds = (days ?? []).map(d => d.id)
    const exercisesByDay: Record<string, { name: string; sets: number; reps: string | null }[]> = {}

    if (dayIds.length > 0) {
        const { data: rdes } = await supabase
            .from('routine_day_exercises')
            .select('routine_day_id, sets, reps, exercise_id')
            .in('routine_day_id', dayIds)
            .order('position', { ascending: true, nullsFirst: false })

        if (rdes && rdes.length > 0) {
            const exerciseIds = [...new Set(rdes.map(r => r.exercise_id).filter(Boolean))]
            const { data: exercises } = await supabase
                .from('exercises')
                .select('id, name')
                .in('id', exerciseIds)

            const exMap = new Map((exercises ?? []).map(e => [e.id, e.name]))

            for (const rde of rdes) {
                if (!rde.routine_day_id) continue
                if (!exercisesByDay[rde.routine_day_id]) {
                    exercisesByDay[rde.routine_day_id] = []
                }
                exercisesByDay[rde.routine_day_id].push({
                    name: exMap.get(rde.exercise_id) ?? 'Ejercicio',
                    sets: rde.sets ?? 3,
                    reps: rde.reps != null ? String(rde.reps) : null,
                })
            }
        }
    }

    return (
        <div className="p-4 pb-24">
            <div className="mx-auto max-w-lg space-y-4">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-foreground">Rutina</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">{routine?.name}</p>
                </div>

                {/* Selector mesociclos */}
                {(months ?? []).length > 1 && (
                    <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Mesociclo
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {(months ?? []).map((month) => {
                                const isActive = month.id === selectedMonth?.id
                                return (
                                    <Link
                                        key={month.id}
                                        href={`/app/rutina?month=${month.id}`}
                                        className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition ${isActive
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {month.name || `Mes ${month.month_number}`}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Selector semanas */}
                {(weeks ?? []).length > 0 && (
                    <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Semana
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {(weeks ?? []).map((week) => {
                                const isActive = week.id === selectedWeek?.id
                                return (
                                    <Link
                                        key={week.id}
                                        href={`/app/rutina?month=${selectedMonth?.id}&week=${week.id}`}
                                        className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition ${isActive
                                                ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500'
                                                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {week.name || `Sem. ${week.week_number}`}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Días */}
                {(days ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                        <p className="text-sm text-muted-foreground">Esta semana no tiene días creados.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {(days ?? []).map((day) => {
                            const dayExercises = exercisesByDay[day.id] ?? []
                            const hasExercises = dayExercises.length > 0
                            const label = day.name?.trim() || `Día ${day.day_index}`

                            return (
                                <div
                                    key={day.id}
                                    className={`overflow-hidden rounded-2xl border ${hasExercises
                                            ? 'border-border bg-card shadow-sm'
                                            : 'border-dashed border-border bg-card/50 opacity-60'
                                        }`}
                                >
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-card-foreground">
                                                    {label}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                                    {hasExercises
                                                        ? `${dayExercises.length} ejercicios · ${dayExercises.reduce((a, e) => a + e.sets, 0)} series`
                                                        : 'Sin ejercicios cargados'}
                                                </p>
                                            </div>

                                            {hasExercises && (
                                                <Link
                                                    href={`/app/train?month=${selectedMonth?.id}&week=${selectedWeek?.id}&day=${day.id}`}
                                                    className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 active:scale-[0.97]"
                                                >
                                                    Entrenar →
                                                </Link>
                                            )}
                                        </div>

                                        {hasExercises && (
                                            <div className="mt-3 space-y-1.5">
                                                {dayExercises.map((ex, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500/10 text-[9px] font-bold text-indigo-500">
                                                                {idx + 1}
                                                            </span>
                                                            <p className="text-xs font-medium text-card-foreground">
                                                                {ex.name}
                                                            </p>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {ex.sets} × {ex.reps ?? '-'} reps
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}