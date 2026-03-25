import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentStats } from '../getStudentStats'
import { getStudentTopProgress } from '../getStudentTopProgress'
import { getStudentWeeklyVolume } from '../getStudentWeeklyVolume'
import { getStudentRecentPRs } from '../getStudentRecentPRs'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import StudentNotesCard from '../StudentNotesCard'

type PageProps = {
    params: {
        studentId: string
    }
}

function formatDate(date: string | null | undefined) {
    if (!date) return 'Sin entrenamientos'

    const parsed = new Date(date)

    if (Number.isNaN(parsed.getTime())) {
        return String(date)
    }

    return parsed.toLocaleDateString('es-AR')
}

function formatStatusLabel(status: string | null | undefined) {
    if (!status) return 'Activo'

    const value = status.toLowerCase()

    if (value.includes('inactive') || value.includes('inactivo')) return 'Inactivo'
    if (value.includes('new') || value.includes('nuevo')) return 'Nuevo'

    return 'Activo'
}

function getStatusClasses(status: string) {
    if (status === 'Inactivo') {
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
    }

    if (status === 'Nuevo') {
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
    }

    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
}

function getInsightToneClasses(tone: 'success' | 'warning' | 'neutral' | 'info') {
    switch (tone) {
        case 'success':
            return 'from-emerald-500 to-teal-500 text-white'
        case 'warning':
            return 'from-amber-500 to-orange-500 text-white'
        case 'info':
            return 'from-indigo-600 to-violet-600 text-white'
        default:
            return 'from-zinc-700 to-zinc-900 text-white'
    }
}

function buildInsight({
    totalSessions,
    totalPRs,
    recentPRs,
    bestProgress,
    weeklyVolume,
    lastWorkoutAt,
}: {
    totalSessions: number
    totalPRs: number
    recentPRs: any[]
    bestProgress: any[]
    weeklyVolume: any[]
    lastWorkoutAt: string | null
}) {
    const best = bestProgress?.[0]

    const bestName =
        best?.exerciseName ??
        best?.exercise_name ??
        null

    const bestProgressKg = Number(
        best?.progressKg ??
        best?.progress_kg ??
        0
    )

    const weeklyTop = weeklyVolume?.[0]
    const weeklyGroup =
        weeklyTop?.groupName ??
        weeklyTop?.exercise_group ??
        weeklyTop?.muscle_group ??
        weeklyTop?.name ??
        null

    const weeklySets = Number(
        weeklyTop?.totalSets ??
        weeklyTop?.total_sets ??
        weeklyTop?.sets ??
        weeklyTop?.volume ??
        0
    )

    const recentPRCount = recentPRs.length

    let daysSinceLastWorkout: number | null = null

    if (lastWorkoutAt) {
        const parsed = new Date(lastWorkoutAt)
        if (!Number.isNaN(parsed.getTime())) {
            const diffMs = Date.now() - parsed.getTime()
            daysSinceLastWorkout = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        }
    }

    if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 10) {
        return {
            title: 'Hace varios días que no entrena',
            description: `Pasaron ${daysSinceLastWorkout} días desde el último entrenamiento.`,
            tone: 'warning' as const,
            badge: 'Inactividad',
        }
    }

    if (bestName && bestProgressKg >= 20) {
        return {
            title: `Gran progreso en ${bestName}`,
            description: `Mejoró ${bestProgressKg} kg y es su avance más fuerte.`,
            tone: 'success' as const,
            badge: 'Progreso',
        }
    }

    if (recentPRCount >= 3) {
        return {
            title: 'Racha de marcas personales',
            description: `Ya sumó ${recentPRCount} PRs recientes.`,
            tone: 'success' as const,
            badge: 'PRs',
        }
    }

    if (weeklyGroup && weeklySets > 0) {
        return {
            title: `Volumen alto en ${weeklyGroup}`,
            description: `${weeklySets} sets registrados en este grupo.`,
            tone: 'info' as const,
            badge: 'Volumen',
        }
    }

    if (totalSessions >= 8 && totalPRs > 0) {
        return {
            title: 'Base sólida de datos',
            description: `${totalSessions} sesiones y ${totalPRs} PRs registrados.`,
            tone: 'neutral' as const,
            badge: 'Base',
        }
    }

    return {
        title: 'Perfil en desarrollo',
        description: 'Faltan más datos para generar insights relevantes.',
        tone: 'neutral' as const,
        badge: 'Inicio',
    }
}

export default async function StudentProfilePage({ params }: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const trainerProfile = await getTrainerProfile()
    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit

    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', params.studentId)
        .eq('trainer_id', user.id)
        .single()

    if (studentError || !student) {
        return (
            <div className="p-6 text-foreground">
                <h1 className="text-xl font-semibold">No se encontró el alumno.</h1>
            </div>
        )
    }

    let routineName = 'Sin rutina'
    let assignedRoutineId: string | null = null

    const { data: assignment } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', params.studentId)
        .maybeSingle()

    if (assignment?.routine_id) {
        const { data: assignedRoutine } = await supabase
            .from('routines')
            .select('id, name, student_id, trainer_id')
            .eq('id', assignment.routine_id)
            .eq('trainer_id', user.id)
            .eq('student_id', params.studentId)
            .maybeSingle()

        if (assignedRoutine?.id) {
            assignedRoutineId = assignedRoutine.id
            routineName = assignedRoutine.name ?? 'Rutina asignada'
        }
    }

    if (!assignedRoutineId) {
        const { data: fallbackRoutine } = await supabase
            .from('routines')
            .select('id, name')
            .eq('student_id', params.studentId)
            .eq('trainer_id', user.id)
            .maybeSingle()

        if (fallbackRoutine?.id) {
            assignedRoutineId = fallbackRoutine.id
            routineName = fallbackRoutine.name ?? 'Rutina asignada'

            const { data: existingAssignment } = await supabase
                .from('student_routines')
                .select('id')
                .eq('student_id', params.studentId)
                .maybeSingle()

            if (existingAssignment?.id) {
                await supabase
                    .from('student_routines')
                    .update({
                        routine_id: fallbackRoutine.id,
                        assigned_at: new Date().toISOString(),
                    })
                    .eq('id', existingAssignment.id)
            } else {
                await supabase.from('student_routines').insert({
                    student_id: params.studentId,
                    routine_id: fallbackRoutine.id,
                    assigned_at: new Date().toISOString(),
                })
            }
        }
    }

    const { data: studentNote } = await supabase
        .from('student_notes')
        .select('note')
        .eq('student_id', params.studentId)
        .eq('trainer_id', user.id)
        .maybeSingle()

    const stats = (await getStudentStats(params.studentId)) as any
    const topProgress = ((await getStudentTopProgress(params.studentId)) ?? []) as any[]
    const weeklyVolume = ((await getStudentWeeklyVolume(params.studentId)) ?? []) as any[]
    const recentPRs = ((await getStudentRecentPRs(params.studentId)) ?? []) as any[]

    const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

    const lastWorkoutAt = stats?.lastWorkoutDate ?? stats?.lastWorkoutAt ?? null
    const totalSessions = Number(stats?.totalSessions ?? stats?.sessions ?? 0)
    const totalPRs = Number(stats?.totalPRs ?? stats?.prs ?? 0)
    const statusLabel = formatStatusLabel(student.active_plan)

    const recentPRsPreview = recentPRs.slice(0, 3)
    const topProgressPreview = topProgress.slice(0, 3)
    const weeklyVolumePreview = weeklyVolume.slice(0, 3)

    const bestPR = recentPRsPreview[0]

    const insight = buildInsight({
        totalSessions,
        totalPRs,
        recentPRs: recentPRsPreview,
        bestProgress: topProgressPreview,
        weeklyVolume: weeklyVolumePreview,
        lastWorkoutAt,
    })

    const heroTone = getInsightToneClasses(insight.tone)

    return (
        <div className="p-4 pb-28 text-foreground md:p-8">
            <div className="mx-auto max-w-5xl space-y-5 md:space-y-6">
                <div className={`overflow-hidden rounded-3xl bg-gradient-to-br ${heroTone} shadow-sm`}>
                    <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                                    {insight.badge}
                                </span>

                                <h1 className="mt-3 text-3xl font-bold tracking-tight">
                                    {fullName}
                                </h1>

                                <p className="mt-2 text-sm text-white/90">
                                    {insight.title}
                                </p>

                                <p className="mt-1 text-sm text-white/75">
                                    {insight.description}
                                </p>
                            </div>

                            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                                {statusLabel}
                            </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/85">
                            <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                                {routineName}
                            </span>

                            <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                                Último entreno: {formatDate(lastWorkoutAt)}
                            </span>

                            {student.email ? (
                                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                                    {student.email}
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <Link
                                href={`/dashboard/students/${params.studentId}/train`}
                                className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
                            >
                                Entrenar
                            </Link>

                            {assignedRoutineId ? (
                                <Link
                                    href={`/dashboard/routines/${assignedRoutineId}`}
                                    className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                                >
                                    Ver rutina
                                </Link>
                            ) : (
                                <Link
                                    href={`/dashboard/students/${params.studentId}/assign-routine`}
                                    className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                                >
                                    Asignar rutina
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Sesiones
                        </p>
                        <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            {totalSessions}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            PRs
                        </p>
                        <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            {totalPRs}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Último entreno
                        </p>
                        <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatDate(lastWorkoutAt)}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Estado
                        </p>
                        <div className="mt-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(statusLabel)}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {bestPR ? (
                    <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-500/15 dark:from-emerald-500/10 dark:to-zinc-900/60 dark:bg-none">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                    PR destacado
                                </p>

                                <h2 className="mt-2 truncate text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {bestPR.exerciseName ?? bestPR.exercise_name ?? 'Ejercicio'}
                                </h2>

                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Registrado el {formatDate(bestPR.performedAt ?? bestPR.performed_at ?? bestPR.date ?? null)}
                                </p>
                            </div>

                            <div className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-3 text-right text-white shadow-sm">
                                <p className="text-[11px] uppercase tracking-wide text-emerald-100">
                                    Mejor carga
                                </p>
                                <p className="mt-1 text-2xl font-bold">
                                    {formatWeight(
                                        Number(bestPR.weight ?? bestPR.bestWeight ?? 0),
                                        weightUnit
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-4">
                        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                    PRs recientes
                                </h2>

                                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                    {recentPRsPreview.length}
                                </span>
                            </div>

                            <div className="mt-4 space-y-3">
                                {recentPRsPreview.length > 0 ? (
                                    recentPRsPreview.map((pr, index) => {
                                        const exerciseName =
                                            pr.exerciseName ?? pr.exercise_name ?? 'Ejercicio'

                                        const date =
                                            pr.performedAt ?? pr.performed_at ?? pr.date ?? null

                                        const weight = Number(pr.weight ?? pr.bestWeight ?? 0)

                                        return (
                                            <div
                                                key={`${exerciseName}-${date}-${index}`}
                                                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                                        🏆 {exerciseName}
                                                    </p>
                                                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                        {formatDate(date)}
                                                    </p>
                                                </div>

                                                <p className="shrink-0 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatWeight(weight, weightUnit)}
                                                </p>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Todavía no hay PRs recientes.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                    Notas del entrenador
                                </h2>

                                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                    Seguimiento
                                </span>
                            </div>

                            <div className="mt-4">
                                <StudentNotesCard
                                    studentId={params.studentId}
                                    initialNote={studentNote?.note || ''}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                    Volumen semanal
                                </h2>

                                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                    Resumen
                                </span>
                            </div>

                            <div className="mt-4 space-y-3">
                                {weeklyVolumePreview.length > 0 ? (
                                    weeklyVolumePreview
                                        .filter((item) => {
                                            const label =
                                                item.groupName ??
                                                item.exercise_group ??
                                                item.muscle_group ??
                                                item.name ??
                                                null

                                            return !!label
                                        })
                                        .map((item, index) => {
                                            const label =
                                                item.groupName ??
                                                item.exercise_group ??
                                                item.muscle_group ??
                                                item.name

                                            const total =
                                                item.totalSets ??
                                                item.total_sets ??
                                                item.sets ??
                                                item.volume ??
                                                0

                                            return (
                                                <div
                                                    key={`${label}-${index}`}
                                                    className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/60"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                            {label}
                                                        </p>
                                                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                            {total} sets
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })
                                ) : (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Todavía no hay volumen registrado.
                                    </p>
                                )}

                                {weeklyVolumePreview.length > 0 &&
                                    weeklyVolumePreview.every((item) => {
                                        const label =
                                            item.groupName ??
                                            item.exercise_group ??
                                            item.muscle_group ??
                                            item.name ??
                                            null

                                        return !label
                                    }) && (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            Todavía no hay grupos definidos para mostrar.
                                        </p>
                                    )}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                    Mejores progresos
                                </h2>

                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    Top 3
                                </span>
                            </div>

                            <div className="mt-4 space-y-3">
                                {topProgressPreview.length > 0 ? (
                                    topProgressPreview.map((item, index) => {
                                        const exerciseName =
                                            item.exerciseName ?? item.exercise_name ?? 'Ejercicio'

                                        const firstWeight = Number(
                                            item.firstWeight ?? item.first_weight ?? 0
                                        )

                                        const bestWeight = Number(
                                            item.bestWeight ?? item.best_weight ?? 0
                                        )

                                        const progressKg = Number(
                                            item.progressKg ?? item.progress_kg ?? 0
                                        )

                                        return (
                                            <div
                                                key={`${exerciseName}-${index}`}
                                                className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/60"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                                            {exerciseName}
                                                        </p>
                                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                            De {formatWeight(firstWeight, weightUnit)} a{' '}
                                                            {formatWeight(bestWeight, weightUnit)}
                                                        </p>
                                                    </div>

                                                    <p className="shrink-0 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                        +{formatWeight(progressKg, weightUnit)}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Todavía no hay progresos suficientes.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}