import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentStats } from '../getStudentStats'
import { getStudentTopProgress } from '../getStudentTopProgress'
import { getStudentTopProgressCharts } from '../getStudentTopProgressCharts'
import { getStudentWeeklyVolume } from '../getStudentWeeklyVolume'
import { getStudentRecentPRs } from '../getStudentRecentPRs'
import { getStudentExercisePRs } from '@/lib/getStudentExercisePRs'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import StudentNotesCard from '../StudentNotesCard'

type PageProps = {
    params: {
        studentId: string
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
            <div className="p-6 text-white">
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
    const topProgress = ((await getStudentTopProgress(params.studentId)) ??
        []) as any[]
    const topProgressCharts = ((await getStudentTopProgressCharts(
        params.studentId
    )) ?? []) as any[]
    const weeklyVolume = ((await getStudentWeeklyVolume(params.studentId)) ??
        []) as any[]
    const recentPRs = ((await getStudentRecentPRs(params.studentId)) ??
        []) as any[]
    const exercisePRs = ((await getStudentExercisePRs(params.studentId)) ??
        []) as any[]

    const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()

    const lastWorkoutLabel =
        stats?.lastWorkoutDate && stats.lastWorkoutDate !== ''
            ? stats.lastWorkoutDate
            : 'Sin registros'

    const totalSessions = Number(stats?.totalSessions ?? stats?.sessions ?? 0)
    const totalPRs = Number(stats?.totalPRs ?? stats?.prs ?? 0)

    const recentPRsPreview = recentPRs.slice(0, 4)
    const topProgressPreview = topProgress.slice(0, 3)
    const bestProgressPreview = topProgressCharts.slice(0, 3)
    const exercisePRsPreview = exercisePRs.slice(0, 4)
    const weeklyVolumePreview = weeklyVolume.slice(0, 4)

    return (
        <div className="p-4 pb-28 text-white md:p-8">
            <div className="mx-auto max-w-5xl">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <p className="text-sm font-medium text-indigo-400">
                        Perfil del alumno
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight">
                        {fullName || 'Alumno'}
                    </h1>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                        <span className="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1">
                            {student.active_plan || 'Activo'}
                        </span>

                        <span className="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1">
                            {routineName}
                        </span>

                        <span className="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1">
                            {student.email || 'Sin email'}
                        </span>
                    </div>

                    <p className="mt-4 text-sm text-zinc-400">
                        Rutina activa:{' '}
                        <span className="font-medium text-white">{routineName}</span>
                    </p>

                    <div className="mt-5 flex gap-3">
                        <Link
                            href={`/dashboard/students/${params.studentId}/train`}
                            className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-emerald-500"
                        >
                            Entrenar
                        </Link>

                        {assignedRoutineId ? (
                            <Link
                                href={`/dashboard/routines/${assignedRoutineId}`}
                                className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                            >
                                Editar rutina
                            </Link>
                        ) : (
                            <Link
                                href={`/dashboard/students/${params.studentId}/assign-routine`}
                                className="rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-indigo-500"
                            >
                                Asignar rutina
                            </Link>
                        )}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                            Último entrenamiento
                        </p>
                        <p className="mt-2 text-xl font-semibold text-white">
                            {lastWorkoutLabel}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                            Sesiones
                        </p>
                        <p className="mt-2 text-3xl font-bold text-white">
                            {totalSessions}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                            PRs
                        </p>
                        <p className="mt-2 text-3xl font-bold text-white">
                            {totalPRs}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                            Estado
                        </p>
                        <p className="mt-2 text-2xl font-bold text-white">
                            {student.active_plan || 'Activo'}
                        </p>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <h2 className="text-xl font-semibold text-white">Volumen semanal</h2>

                    <div className="mt-4 space-y-3">
                        {weeklyVolumePreview.length > 0 ? (
                            weeklyVolumePreview.map((item, index) => {
                                const label =
                                    item.groupName ??
                                    item.exercise_group ??
                                    item.muscle_group ??
                                    item.name ??
                                    'Otros'

                                const total =
                                    item.totalSets ??
                                    item.total_sets ??
                                    item.sets ??
                                    item.volume ??
                                    0

                                return (
                                    <div
                                        key={`${label}-${index}`}
                                        className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                                    >
                                        <p className="text-sm font-medium text-zinc-100">
                                            {label}
                                        </p>
                                        <p className="text-sm font-semibold text-indigo-400">
                                            {total} series
                                        </p>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-sm text-zinc-500">
                                Todavía no hay volumen registrado.
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <h2 className="text-xl font-semibold text-white">PRs recientes</h2>

                    <div className="mt-4 space-y-3">
                        {recentPRsPreview.length > 0 ? (
                            recentPRsPreview.map((pr, index) => {
                                const exerciseName = pr.exerciseName ?? pr.exercise_name ?? 'Ejercicio'
                                const date = pr.date ?? pr.performed_at ?? '-'
                                const weight = Number(pr.weight ?? pr.bestWeight ?? 0)

                                return (
                                    <div
                                        key={`${exerciseName}-${index}`}
                                        className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-zinc-100">
                                                🏆 {exerciseName}
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500">{date}</p>
                                        </div>

                                        <p className="ml-3 shrink-0 text-xl font-bold text-green-400">
                                            {formatWeight(weight, weightUnit)}
                                        </p>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-sm text-zinc-500">
                                Todavía no hay PRs recientes.
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <StudentNotesCard
                        studentId={params.studentId}
                        initialNote={studentNote?.note || ''}
                    />
                </div>

                <details className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60">
                    <summary className="cursor-pointer list-none px-5 py-4 text-lg font-semibold text-white">
                        Top progresos
                    </summary>

                    <div className="border-t border-zinc-800 px-5 py-4">
                        {topProgressPreview.length > 0 ? (
                            <div className="space-y-3">
                                {topProgressPreview.map((item, index) => {
                                    const exerciseName = item.exerciseName ?? item.exercise_name ?? 'Ejercicio'
                                    const firstWeight = Number(item.firstWeight ?? item.first_weight ?? 0)
                                    const bestWeight = Number(item.bestWeight ?? item.best_weight ?? 0)
                                    const progressKg = Number(item.progressKg ?? item.progress_kg ?? 0)

                                    return (
                                        <div
                                            key={`${exerciseName}-${index}`}
                                            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium text-zinc-100">
                                                    {index + 1}. {exerciseName}
                                                </p>
                                                <p className="mt-1 text-sm text-zinc-400">
                                                    De {formatWeight(firstWeight, weightUnit)} a{' '}
                                                    {formatWeight(bestWeight, weightUnit)}
                                                </p>
                                            </div>

                                            <p className="ml-3 shrink-0 text-2xl font-bold text-green-400">
                                                +{formatWeight(progressKg, weightUnit)}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500">
                                Todavía no hay progresos suficientes.
                            </p>
                        )}
                    </div>
                </details>

                <details className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60">
                    <summary className="cursor-pointer list-none px-5 py-4 text-lg font-semibold text-white">
                        Mejores progresos
                    </summary>

                    <div className="border-t border-zinc-800 px-5 py-4">
                        {bestProgressPreview.length > 0 ? (
                            <div className="space-y-3">
                                {bestProgressPreview.map((item, index) => {
                                    const exerciseName = item.exerciseName ?? item.exercise_name ?? 'Ejercicio'
                                    const bestWeight = Number(item.bestWeight ?? item.best_weight ?? 0)

                                    return (
                                        <div
                                            key={`${exerciseName}-${index}`}
                                            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                                        >
                                            <p className="font-medium text-zinc-100">{exerciseName}</p>
                                            <p className="mt-1 text-sm text-zinc-400">
                                                Mejor marca: {formatWeight(bestWeight, weightUnit)}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500">
                                Todavía no hay datos de mejores progresos.
                            </p>
                        )}
                    </div>
                </details>

                <details className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60">
                    <summary className="cursor-pointer list-none px-5 py-4 text-lg font-semibold text-white">
                        PRs históricos por ejercicio
                    </summary>

                    <div className="border-t border-zinc-800 px-5 py-4">
                        {exercisePRsPreview.length > 0 ? (
                            <div className="space-y-3">
                                {exercisePRsPreview.map((item, index) => {
                                    const exerciseName = item.exerciseName ?? item.exercise_name ?? 'Ejercicio'
                                    const reps = item.reps ?? item.best_reps ?? '-'
                                    const weight = Number(item.weight ?? item.bestWeight ?? item.best_weight ?? 0)

                                    return (
                                        <div
                                            key={`${exerciseName}-${index}`}
                                            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-zinc-100">
                                                    {exerciseName}
                                                </p>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {reps} reps
                                                </p>
                                            </div>

                                            <p className="ml-3 shrink-0 text-xl font-bold text-green-400">
                                                {formatWeight(weight, weightUnit)}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500">
                                Todavía no hay PRs históricos.
                            </p>
                        )}
                    </div>
                </details>
            </div>
        </div>
    )
}