import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'
import { getStudentRoutineWeekProgress, type RoutineDayProgressStatus } from '@/lib/studentRoutineWeekProgress'
import { getBuenosAiresHour } from '@/lib/buenosAiresDate'
import { getActiveStudentRoutine } from '@/lib/getActiveStudentRoutine'
import { getStudentAppContext } from '@/lib/auth/student'

export default async function AppHomePage() {
    const supabase = await createClient()
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const { profile } = context
    const studentId = profile.student_id
    if (!studentId) redirect('/app')

    const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name, trainer_id')
        .eq('id', studentId)
        .single()

    // Rutina asignada
    const assignment = await getActiveStudentRoutine(supabase, studentId)

    let routineName: string | null = null
    let assignedRoutineId: string | null = null
    let selectedMonthId: string | null = null
    let selectedWeekId: string | null = null
    let selectedDayId: string | null = null
    let selectedDayLabel: string | null = null
    let selectedDayStatus: RoutineDayProgressStatus = 'pending'
    let completedDays = 0
    let totalTrainingDays = 0
    let weekCompleted = false
    let programWeekNumber = 0
    let totalProgramWeeks = 0
    let todayExercises: { name: string; sets: number; reps: string | null }[] = []

    if (assignment?.routineId) {
        const { data: routine } = await supabase
            .from('routines')
            .select('id, name')
            .eq('id', assignment.routineId)
            .single()

        if (routine) {
            assignedRoutineId = routine.id
            routineName = routine.name

            const schedule = await getRoutineSchedule(supabase, routine.id, {
                programStartedOn: assignment.programStartedOn,
            })
            selectedMonthId = schedule.selectedMonth?.id ?? null
            selectedWeekId = schedule.selectedWeek?.id ?? null
            programWeekNumber = schedule.programWeekNumber
            totalProgramWeeks = schedule.totalProgramWeeks

            if (selectedWeekId) {

                const { data: days } = await supabase
                    .from('routine_days')
                    .select('id, name, title, day_index')
                    .eq('routine_week_id', selectedWeekId)
                    .order('day_index', { ascending: true })

                if (days && days.length > 0) {
                    const dayIds = days.map((day) => day.id)
                    const { data: weekExercises } = await supabase
                        .from('routine_day_exercises')
                        .select('routine_day_id')
                        .in('routine_day_id', dayIds)

                    const daysWithExercises = new Set(
                        (weekExercises ?? []).map((exercise) => exercise.routine_day_id).filter(Boolean)
                    )
                    const trainingDays = days.filter((day) => daysWithExercises.has(day.id))
                    totalTrainingDays = trainingDays.length

                    if (trainingDays.length > 0) {
                        const progress = await getStudentRoutineWeekProgress(
                            supabase,
                            studentId,
                            trainingDays.map((day) => day.id),
                            schedule.selectedWeekStart && schedule.selectedWeekEnd
                                ? {
                                    weekStart: schedule.selectedWeekStart,
                                    weekEnd: schedule.selectedWeekEnd,
                                }
                                : null
                        )

                        completedDays = trainingDays.filter(
                            (day) => progress.statusByDayId.get(day.id) === 'completed'
                        ).length

                        const nextDay = trainingDays.find(
                            (day) => progress.statusByDayId.get(day.id) === 'in_progress'
                        ) ?? trainingDays.find(
                            (day) => progress.statusByDayId.get(day.id) !== 'completed'
                        )

                        weekCompleted = !nextDay
                        const selectedDay = nextDay ?? trainingDays[0]
                        selectedDayId = selectedDay.id
                        selectedDayLabel = selectedDay.name?.trim()
                            || selectedDay.title?.trim()
                            || `Día ${selectedDay.day_index}`
                        selectedDayStatus = progress.statusByDayId.get(selectedDay.id) ?? 'pending'
                    } else {
                        selectedDayId = days[0].id
                        selectedDayLabel = days[0].name?.trim()
                            || days[0].title?.trim()
                            || `Día ${days[0].day_index}`
                    }
                }
            }

            // Ejercicios del día seleccionado
            if (selectedDayId) {
                const { data: rdes } = await supabase
                    .from('routine_day_exercises')
                    .select('sets, reps, exercise_id')
                    .eq('routine_day_id', selectedDayId)
                    .order('position', { ascending: true })

                if (rdes && rdes.length > 0) {
                    const exerciseIds = [...new Set(rdes.map(r => r.exercise_id).filter(Boolean))]
                    const { data: exercises } = await supabase
                        .from('exercises')
                        .select('id, name')
                        .in('id', exerciseIds)

                    const exMap = new Map((exercises ?? []).map(e => [e.id, e.name]))

                    todayExercises = rdes.map(r => ({
                        name: exMap.get(r.exercise_id) ?? 'Ejercicio',
                        sets: r.sets ?? 3,
                        reps: r.reps != null ? String(r.reps) : null,
                    }))
                }
            }
        }
    }

    const firstName = student?.first_name ?? profile?.name ?? 'Atleta'

    const trainHref = assignedRoutineId && selectedWeekId && selectedDayId
        ? `/app/train?${selectedMonthId ? `month=${selectedMonthId}&` : ''}week=${selectedWeekId}&day=${selectedDayId}`
        : '/app/train'
    const routineHref = selectedWeekId
        ? `/app/rutina?${selectedMonthId ? `month=${selectedMonthId}&` : ''}week=${selectedWeekId}`
        : '/app/rutina'

    // Hora del día para saludo
    const hour = getBuenosAiresHour()
    const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-lg space-y-4">

                {/* ── Header ── */}
                <div className="pt-2">
                    <p className="text-xs font-medium text-indigo-500">Progrezzia</p>
                    <h1 className="mt-1 text-2xl font-black text-foreground">
                        {greeting}, {firstName} 👋
                    </h1>
                    {routineName && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{routineName}</p>
                    )}
                </div>

                {/* ── CTA Entrenar ── */}
                {assignedRoutineId && weekCompleted ? (
                    <Link
                        href={routineHref}
                        className="block overflow-hidden rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.08] shadow-sm transition active:scale-[0.98]"
                    >
                        <div className="p-5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                                Semana completada
                            </p>
                            <h2 className="mt-1.5 text-xl font-black text-foreground">
                                ¡Excelente trabajo! ✓
                            </h2>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                Completaste tus {totalTrainingDays} entrenamientos. Podés revisar la rutina cuando quieras.
                            </p>
                        </div>
                        <div className="border-t border-emerald-500/15 px-5 py-3">
                            <p className="text-xs font-semibold text-emerald-500">Ver semana</p>
                        </div>
                    </Link>
                ) : assignedRoutineId ? (
                    <Link
                        href={trainHref}
                        className="block overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20 transition active:scale-[0.98]"
                    >
                        <div className="p-5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                                {selectedDayStatus === 'in_progress' ? 'Sesión en curso' : 'Próximo entrenamiento'}
                            </p>
                            <h2 className="mt-1.5 text-xl font-black text-white">
                                {selectedDayStatus === 'in_progress' ? 'Continuar sesión →' : `${selectedDayLabel ?? 'Entrenar'} →`}
                            </h2>
                            <p className="mt-0.5 text-xs text-indigo-200">
                                {todayExercises.length > 0
                                    ? `${todayExercises.length} ejercicios · ${todayExercises.reduce((a, e) => a + e.sets, 0)} series`
                                    : 'Tocá para abrir tu rutina'}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-medium text-white backdrop-blur">
                                    {routineName}
                                </span>
                                {totalTrainingDays > 0 && (
                                    <span className="text-[10px] font-medium text-indigo-100">
                                        {completedDays} de {totalTrainingDays} completados
                                    </span>
                                )}
                                {totalProgramWeeks > 1 && (
                                    <span className="text-[10px] font-medium text-indigo-100">
                                        Semana {programWeekNumber} de {totalProgramWeeks}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="border-t border-white/10 bg-white/5 px-5 py-3">
                            <p className="text-xs font-semibold text-white">
                                {selectedDayStatus === 'in_progress' ? 'Retomar donde lo dejaste' : 'Tocar para comenzar'}
                            </p>
                        </div>
                    </Link>
                ) : (
                    <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center">
                        <p className="text-3xl">📋</p>
                        <p className="mt-3 text-sm font-semibold text-card-foreground">Sin rutina asignada</p>
                        <p className="mt-1 text-xs text-muted-foreground">Tu entrenador todavía no te asignó una rutina.</p>
                    </div>
                )}

                {/* ── Ejercicios de hoy ── */}
                {todayExercises.length > 0 && !weekCompleted && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {selectedDayStatus === 'in_progress' ? 'Sesión pendiente' : 'Próxima sesión'}
                        </p>
                        <div className="mt-3 space-y-2">
                            {todayExercises.map((ex, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-[10px] font-bold text-indigo-500">
                                            {idx + 1}
                                        </span>
                                        <p className="text-xs font-medium text-card-foreground">{ex.name}</p>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {ex.sets} × {ex.reps ?? '-'} reps
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Link
                    href="/app/logros"
                    prefetch={true}
                    className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-3.5 py-3 transition active:scale-[0.98]"
                >
                    <div>
                        <p className="text-sm font-bold text-card-foreground">🏆 Mis logros</p>
                        <p className="text-[10px] text-muted-foreground">Constancia y objetivos alcanzados</p>
                    </div>
                    <span className="text-amber-400">→</span>
                </Link>
            </div>
        </div>
    )
}
