import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'
import { getStudentRoutineWeekProgress } from '@/lib/studentRoutineWeekProgress'
import { getActiveStudentRoutine } from '@/lib/getActiveStudentRoutine'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import { getStudentAppContext } from '@/lib/auth/student'

type PageProps = {
    searchParams?: Promise<{
        month?: string
        week?: string
    }>
}

export default async function AppRutinePage(props: PageProps) {
    const searchParams = await props.searchParams;
    const supabase = await createClient()
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const studentId = context.profile.student_id
    if (!studentId) redirect('/app')

    const assignment = await getActiveStudentRoutine(supabase, studentId)

    if (!assignment?.routineId) {
        return (
            <div className="p-4 pb-24">
                <div className="mx-auto max-w-lg">
                    <div className="mb-4"><StudentPageHeader title="Rutina" subtitle="Tu programa actual" /></div>
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
        .eq('id', assignment.routineId)
        .single()

    const {
        months,
        weeks,
        selectedMonth,
        selectedWeek,
        currentWeek,
        programWeekNumber,
        totalProgramWeeks,
        selectedProgramWeekNumber,
        selectedWeekStart,
        selectedWeekEnd,
    } = await getRoutineSchedule(
        supabase,
        assignment.routineId,
        {
            requestedMonthId: searchParams?.month,
            requestedWeekId: searchParams?.week,
            programStartedOn: assignment.programStartedOn,
        }
    )

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

    const trainingDayIds = dayIds.filter((dayId) => (exercisesByDay[dayId]?.length ?? 0) > 0)
    const weekProgress = await getStudentRoutineWeekProgress(
        supabase,
        studentId,
        trainingDayIds,
        selectedWeekStart && selectedWeekEnd ? { weekStart: selectedWeekStart, weekEnd: selectedWeekEnd } : null
    )
    const completedDays = trainingDayIds.filter(
        (dayId) => weekProgress.statusByDayId.get(dayId) === 'completed'
    ).length
    const progressPercent = trainingDayIds.length > 0
        ? Math.round((completedDays / trainingDayIds.length) * 100)
        : 0

    return (
        <div className="p-4 pb-24">
            <div className="mx-auto max-w-lg space-y-4">

                {/* Header */}
                <StudentPageHeader
                    title="Rutina"
                    subtitle={`${routine?.name ?? 'Programa'}${totalProgramWeeks > 1
                        ? selectedWeek?.id === currentWeek?.id
                            ? ` · Semana ${programWeekNumber} de ${totalProgramWeeks}`
                            : ` · Viendo semana ${selectedProgramWeekNumber}`
                        : ''}`}
                />

                {trainingDayIds.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-3.5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-card-foreground">
                                    {completedDays === trainingDayIds.length
                                        ? 'Semana completada ✓'
                                        : 'Tu progreso esta semana'}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {completedDays} de {trainingDayIds.length} entrenamientos completados
                                </p>
                            </div>
                            <span className={`text-lg font-black ${progressPercent === 100 ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                {progressPercent}%
                            </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full transition-all ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Selector mesociclos */}
                {months.length > 1 && (
                    <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Mesociclo
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {months.map((month) => {
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
                {weeks.length > 0 && (
                    <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Semana
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {weeks.map((week) => {
                                const isActive = week.id === selectedWeek?.id
                                return (
                                    <Link
                                        key={week.id}
                                        href={`/app/rutina?${selectedMonth ? `month=${selectedMonth.id}&` : ''}week=${week.id}`}
                                        className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition ${isActive
                                                ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500'
                                                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {week.name || `Sem. ${week.week_number}`}
                                        {week.id === currentWeek?.id ? ' · Actual' : ''}
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
                            const status = weekProgress.statusByDayId.get(day.id) ?? 'pending'
                            const isCompleted = status === 'completed'
                            const isInProgress = status === 'in_progress'

                            return (
                                <div
                                    key={day.id}
                                    className={`overflow-hidden rounded-xl border ${hasExercises
                                            ? isCompleted
                                                ? 'border-emerald-500/30 bg-emerald-500/[0.04] shadow-sm'
                                                : isInProgress
                                                    ? 'border-indigo-500/40 bg-indigo-500/[0.04] shadow-sm'
                                                    : 'border-border bg-card shadow-sm'
                                            : 'border-dashed border-border bg-card/50 opacity-60'
                                        }`}
                                >
                                    <div className="p-3.5">
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
                                                {isCompleted && (
                                                    <p className="mt-1.5 text-xs font-bold text-emerald-500">✓ Completado esta semana</p>
                                                )}
                                                {isInProgress && (
                                                    <p className="mt-1.5 text-xs font-bold text-indigo-500">Sesión en curso</p>
                                                )}
                                            </div>

                                            {hasExercises && !isCompleted && (
                                                <Link
                                                    href={`/app/train?${selectedMonth ? `month=${selectedMonth.id}&` : ''}week=${selectedWeek?.id}&day=${day.id}`}
                                                    className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 active:scale-[0.97]"
                                                >
                                                    {isInProgress ? 'Continuar →' : 'Entrenar →'}
                                                </Link>
                                            )}
                                            {hasExercises && isCompleted && (
                                                <Link
                                                    href="/app/history"
                                                    className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-500 transition active:scale-[0.97]"
                                                >
                                                    Ver registro
                                                </Link>
                                            )}
                                        </div>

                                        {hasExercises && (
                                            <div className="mt-3 space-y-1.5">
                                                {dayExercises.slice(0, 3).map((ex, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5"
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
                                                {dayExercises.length > 3 && (
                                                    <p className="px-2.5 pt-1 text-[10px] font-medium text-muted-foreground">
                                                        + {dayExercises.length - 3} ejercicios más
                                                    </p>
                                                )}
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
