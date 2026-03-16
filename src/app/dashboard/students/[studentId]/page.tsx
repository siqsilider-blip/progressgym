import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentStatsCards from '../StudentStatsCards'
import { getStudentStats } from '../getStudentStats'
import StudentBestProgressCard from '../StudentBestProgressCard'
import { getStudentBestProgress } from '../getStudentBestProgress'
import StudentStagnationCard from '../StudentStagnationCard'
import { getStudentStagnation } from '../getStudentStagnation'
import StudentAdherenceCard from '../StudentAdherenceCard'
import { getStudentAdherence } from '../getStudentAdherence'
import StudentNotesCard from '../StudentNotesCard'
import { getStudentTopProgress } from '../getStudentTopProgress'
import { getStudentTopProgressCharts } from '../getStudentTopProgressCharts'
import StudentTopProgressCharts from '../StudentTopProgressCharts'
import { getStudentWeeklyVolume } from '../getStudentWeeklyVolume'
import StudentWeeklyVolumeCard from '../StudentWeeklyVolumeCard'
import { getStudentRecentPRs } from '../getStudentRecentPRs'
import StudentRecentPRsCard from '../StudentRecentPRsCard'
import { getStudentExercisePRs } from '@/lib/getStudentExercisePRs'
import StudentExercisePRsCard from '@/components/StudentExercisePRsCard'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'

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

    const { data: assignment } = await supabase
        .from('student_routines')
        .select('id, routine_id')
        .eq('student_id', params.studentId)
        .maybeSingle()

    let routineName = 'Sin rutina'
    let assignedRoutineId: string | null = null

    if (assignment?.routine_id) {
        assignedRoutineId = assignment.routine_id

        const { data: routine } = await supabase
            .from('routines')
            .select('id, name')
            .eq('id', assignment.routine_id)
            .maybeSingle()

        if (routine?.name) {
            routineName = routine.name
        }
    }

    const { data: studentNote } = await supabase
        .from('student_notes')
        .select('note')
        .eq('student_id', params.studentId)
        .eq('trainer_id', user.id)
        .maybeSingle()

    const stats = await getStudentStats(params.studentId)
    const bestProgress = await getStudentBestProgress(params.studentId)
    const stagnation = await getStudentStagnation(params.studentId)
    const adherence = await getStudentAdherence(params.studentId)
    const topProgressCharts = await getStudentTopProgressCharts(params.studentId)
    const topProgress = await getStudentTopProgress(params.studentId)
    const weeklyVolume = await getStudentWeeklyVolume(params.studentId)
    const recentPRs = await getStudentRecentPRs(params.studentId)
    const exercisePRs = await getStudentExercisePRs(params.studentId)

    return (
        <div className="p-8 text-white">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {student.first_name} {student.last_name}
                    </h1>
                    <p className="mt-2 text-sm text-zinc-400">Perfil del alumno</p>
                </div>

                <div className="flex gap-3">
                    {assignedRoutineId && (
                        <Link
                            href={`/dashboard/routines/${assignedRoutineId}`}
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                        >
                            Ver rutina
                        </Link>
                    )}

                    <Link
                        href={`/dashboard/students/${params.studentId}/assign-routine`}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                        Assign Routine
                    </Link>
                </div>
            </div>

            <div className="mb-6">
                <StudentStatsCards stats={stats} />
            </div>

            <div className="mb-6">
                <StudentWeeklyVolumeCard volume={weeklyVolume} />
            </div>

            <div className="mb-6">
                <StudentRecentPRsCard
                    prs={recentPRs}
                    weightUnit={weightUnit}
                />
            </div>

            <div className="mb-6">
                <StudentExercisePRsCard
                    prs={exercisePRs}
                    weightUnit={weightUnit}
                />
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-3">
                <StudentBestProgressCard
                    bestProgress={bestProgress}
                    weightUnit={weightUnit}
                />
                <StudentStagnationCard stagnation={stagnation} />
                <StudentAdherenceCard adherence={adherence} />
            </div>

            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                    Top progresos
                </h2>

                {topProgress.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                        Todavía no hay progresos registrados.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {topProgress.map((item, index) => (
                            <div
                                key={`${item.exerciseName}-${index}`}
                                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                            >
                                <div>
                                    <p className="font-medium text-zinc-100">
                                        {index + 1}. {item.exerciseName}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        De {formatWeight(item.firstWeight, weightUnit)} a{' '}
                                        {formatWeight(item.bestWeight, weightUnit)}
                                    </p>
                                </div>

                                <p className="text-lg font-semibold text-green-400">
                                    +{formatWeight(item.progressKg, weightUnit)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mb-6">
                <StudentTopProgressCharts
                    charts={topProgressCharts}
                    weightUnit={weightUnit}
                />
            </div>
            <div className="mb-6">
                <StudentNotesCard
                    studentId={params.studentId}
                    initialNote={studentNote?.note || ''}
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 lg:col-span-2">
                    <h2 className="mb-5 text-lg font-semibold text-zinc-100">
                        Información general
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                                Nombre
                            </p>
                            <p className="mt-2 text-base font-medium text-zinc-100">
                                {student.first_name}
                            </p>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                                Apellido
                            </p>
                            <p className="mt-2 text-base font-medium text-zinc-100">
                                {student.last_name}
                            </p>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                                Email
                            </p>
                            <p className="mt-2 text-base font-medium text-zinc-100">
                                {student.email || 'Sin email'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                                Plan activo
                            </p>
                            <p className="mt-2 text-base font-medium text-zinc-100">
                                {student.active_plan || 'Sin plan'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="mb-5 text-lg font-semibold text-zinc-100">Resumen</h2>

                    <div className="space-y-4">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                                Rutina asignada
                            </p>
                            <p className="mt-2 text-base font-medium text-zinc-100">
                                {routineName}
                            </p>

                            {assignedRoutineId ? (
                                <Link
                                    href={`/dashboard/routines/${assignedRoutineId}`}
                                    className="mt-3 inline-block text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
                                >
                                    Ver rutina →
                                </Link>
                            ) : (
                                <p className="mt-3 text-sm text-zinc-500">
                                    Todavía no hay una rutina asignada.
                                </p>
                            )}
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                                Próximamente
                            </p>

                            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                                <li>• progreso de cargas</li>
                                <li>• historial de entrenamientos</li>
                                <li>• notas del alumno</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}