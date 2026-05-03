import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStudentExerciseProgress } from '@/app/dashboard/students/getStudentExerciseProgress'
import { getStudentSessionHistory } from '@/app/dashboard/students/getStudentSessionHistory'
import { formatWeight, type WeightUnit } from '@/lib/weight'

export default async function AppHomePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('name, student_id')
        .eq('id', user.id)
        .single()

    const studentId = profile?.student_id
    if (!studentId) redirect('/app')

    const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name, trainer_id')
        .eq('id', studentId)
        .single()

    // Trainer profile for weight unit
    const trainerProfile = student?.trainer_id ? await supabase
        .from('profiles')
        .select('weight_unit')
        .eq('id', student.trainer_id)
        .single()
        .then(r => r.data) : null

    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit

    // Rutina asignada
    const { data: assignment } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', studentId)
        .maybeSingle()

    let routineName: string | null = null
    let assignedRoutineId: string | null = null
    let selectedMonthId: string | null = null
    let selectedWeekId: string | null = null
    let selectedDayId: string | null = null
    let todayExercises: { name: string; sets: number; reps: string | null }[] = []

    if (assignment?.routine_id) {
        const { data: routine } = await supabase
            .from('routines')
            .select('id, name')
            .eq('id', assignment.routine_id)
            .single()

        if (routine) {
            assignedRoutineId = routine.id
            routineName = routine.name

            const { data: months } = await supabase
                .from('routine_months')
                .select('id, month_number')
                .eq('routine_id', routine.id)
                .order('month_number', { ascending: true })
                .limit(1)

            if (months?.[0]) {
                selectedMonthId = months[0].id

                const { data: weeks } = await supabase
                    .from('routine_weeks')
                    .select('id, week_number')
                    .eq('routine_month_id', selectedMonthId)
                    .order('week_number', { ascending: true })
                    .limit(1)

                if (weeks?.[0]) {
                    selectedWeekId = weeks[0].id

                    // Buscar todos los días de la semana
                    const { data: days } = await supabase
                        .from('routine_days')
                        .select('id, title, day_index')
                        .eq('routine_week_id', selectedWeekId)
                        .order('day_index', { ascending: true })

                    if (days && days.length > 0) {
                        // Buscar el primer día que tenga ejercicios
                        for (const day of days) {
                            const { count } = await supabase
                                .from('routine_day_exercises')
                                .select('id', { count: 'exact', head: true })
                                .eq('routine_day_id', day.id)

                            if ((count ?? 0) > 0) {
                                selectedDayId = day.id
                                break
                            }
                        }
                        // Si ningún día tiene ejercicios, usar el primero igual
                        if (!selectedDayId) selectedDayId = days[0].id
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
    }

    // Datos de progreso y sesiones
    const [progressData, sessions] = await Promise.all([
        getStudentExerciseProgress(studentId),
        getStudentSessionHistory(studentId, 10),
    ])

    const firstName = student?.first_name ?? profile?.name ?? 'Atleta'
    const totalProgress = progressData.reduce((acc, e) => acc + e.progressKg, 0)
    const totalSessions = sessions.length
    const bestExercise = progressData[0] ?? null

    // Racha: días consecutivos con sesión (contando hacia atrás desde hoy)
    const today = new Date()
    let streak = 0
    const sessionDates = new Set(sessions.map(s => s.performedDate))
    for (let i = 0; i < 30; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        if (sessionDates.has(dateStr)) {
            streak++
        } else if (i > 0) {
            break
        }
    }

    // PRs recientes (ejercicios con progreso > 0, ordenados por último registro)
    const recentPRs = progressData
        .filter(p => p.progressKg > 0)
        .slice(0, 3)

    const trainHref = assignedRoutineId && selectedMonthId && selectedWeekId && selectedDayId
        ? `/app/train?month=${selectedMonthId}&week=${selectedWeekId}&day=${selectedDayId}`
        : '/app/train'

    // Hora del día para saludo
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-lg space-y-4">

                {/* ── Header ── */}
                <div className="pt-2">
                    <p className="text-xs font-medium text-indigo-500">ProgressGym</p>
                    <h1 className="mt-1 text-2xl font-black text-foreground">
                        {greeting}, {firstName} 👋
                    </h1>
                    {routineName && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{routineName}</p>
                    )}
                </div>

                {/* ── Stats rápidas ── */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-border bg-card p-3 text-center">
                        <p className="text-2xl font-black text-indigo-400">{totalSessions}</p>
                        <p className="text-[10px] text-muted-foreground">Sesiones</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-3 text-center">
                        <p className="text-2xl font-black text-emerald-400">
                            +{totalProgress > 0 ? totalProgress.toFixed(0) : '0'}{weightUnit}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Progreso total</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-3 text-center">
                        <p className="text-2xl font-black text-amber-400">
                            {streak > 0 ? `${streak}🔥` : '0'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Racha</p>
                    </div>
                </div>

                {/* ── CTA Entrenar ── */}
                {assignedRoutineId ? (
                    <Link
                        href={trainHref}
                        className="block overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20 transition active:scale-[0.98]"
                    >
                        <div className="p-5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                                Listo para entrenar
                            </p>
                            <h2 className="mt-1.5 text-xl font-black text-white">
                                Empezar sesión →
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
                            </div>
                        </div>
                        <div className="border-t border-white/10 bg-white/5 px-5 py-3">
                            <p className="text-xs font-semibold text-white">
                                Tocar para comenzar
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
                {todayExercises.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Rutina de hoy
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

                {/* ── Mejor ejercicio ── */}
                {bestExercise && (
                    <Link
                        href="/app/progress"
                        className="block rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 transition active:scale-[0.98]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                                    Mejor progreso
                                </p>
                                <p className="mt-1 text-sm font-bold text-card-foreground">
                                    {bestExercise.exerciseName}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {bestExercise.firstWeight}{weightUnit} → {bestExercise.bestWeight}{weightUnit}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-emerald-500">
                                    +{bestExercise.progressKg}{weightUnit}
                                </p>
                                <p className="text-[10px] text-emerald-500/70">
                                    +{bestExercise.progressPercent}%
                                </p>
                            </div>
                        </div>
                    </Link>
                )}

                {/* ── PRs recientes ── */}
                {recentPRs.length > 1 && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Ejercicios con progreso
                            </p>
                            <Link href="/app/progress" className="text-[10px] font-medium text-indigo-500">
                                Ver todo →
                            </Link>
                        </div>
                        <div className="mt-3 space-y-2">
                            {recentPRs.map((pr, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2"
                                >
                                    <p className="text-xs font-medium text-card-foreground">{pr.exerciseName}</p>
                                    <p className="text-xs font-bold text-emerald-500">+{pr.progressKg}{weightUnit}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Accesos rápidos ── */}
                <div className="grid grid-cols-2 gap-3">
                    <Link
                        href="/app/progress"
                        className="rounded-2xl border border-border bg-card p-4 transition hover:bg-muted/40 active:scale-[0.97]"
                    >
                        <p className="text-xl">📈</p>
                        <p className="mt-2 text-sm font-bold text-card-foreground">Mi progreso</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {progressData.length} ejercicios tracked
                        </p>
                    </Link>

                    <Link
                        href="/app/history"
                        className="rounded-2xl border border-border bg-card p-4 transition hover:bg-muted/40 active:scale-[0.97]"
                    >
                        <p className="text-xl">🗓</p>
                        <p className="mt-2 text-sm font-bold text-card-foreground">Historial</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {sessions.length > 0
                                ? `${sessions.length} sesiones`
                                : 'Sin sesiones aún'}
                        </p>
                    </Link>

                    <Link
                        href="/app/logros"
                        className="col-span-2 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 transition hover:bg-amber-500/[0.07] active:scale-[0.97]"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-card-foreground">🏆 Mis logros</p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    Hitos y badges desbloqueados
                                </p>
                            </div>
                            <span className="text-xl">→</span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}