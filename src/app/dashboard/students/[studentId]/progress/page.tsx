import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentRecentPRs } from '../../getStudentRecentPRs'
import { getStudentTopProgress } from '../../getStudentTopProgress'

type PageProps = {
    params: Promise<{
        studentId: string
    }>
}

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    active_plan: string | null
}

type Routine = {
    id: string
    student_id: string
}

export default async function StudentProgressPage({ params }: PageProps) {
    const { studentId } = await params
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, active_plan')
        .eq('id', studentId)
        .eq('trainer_id', user.id)
        .maybeSingle()

    if (studentError || !student) {
        return (
            <div className="p-8 text-white">
                <h1 className="text-3xl font-bold tracking-tight">Progreso</h1>
                <div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
                    No se pudo cargar el alumno.
                </div>
            </div>
        )
    }

    const typedStudent = student as Student

    const fullName =
        `${typedStudent.first_name ?? ''} ${typedStudent.last_name ?? ''}`.trim() ||
        'Sin nombre'

    const { data: routineData } = await supabase
        .from('routines')
        .select('id, student_id')
        .eq('trainer_id', user.id)
        .eq('student_id', studentId)
        .maybeSingle()

    const routine = (routineData as Routine | null) ?? null

    const recentPRs = await getStudentRecentPRs(studentId)
    const topProgress = await getStudentTopProgress(studentId)

    const bestProgress = topProgress.length > 0 ? topProgress[0] : null
    const latestRecord = recentPRs.length > 0 ? recentPRs[0] : null

    return (
        <div className="p-8 text-white">
            <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Progreso</h1>
                    <p className="mt-2 text-sm text-zinc-400">Alumno: {fullName}</p>
                </div>

                <div className="flex gap-2">
                    <Link
                        href={`/dashboard/students/${studentId}`}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                    >
                        Ver perfil
                    </Link>

                    {routine ? (
                        <Link
                            href={`/dashboard/routines/${routine.id}`}
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                        >
                            Ver rutina
                        </Link>
                    ) : (
                        <Link
                            href={`/dashboard/routines/new?studentId=${studentId}`}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                        >
                            Crear rutina
                        </Link>
                    )}
                </div>
            </div>

            <div className="mb-8 grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="text-sm font-medium text-zinc-400">Mejor PR</h2>

                    {bestProgress ? (
                        <>
                            <p className="mt-3 text-xl font-semibold text-zinc-100">
                                {bestProgress.exerciseName}
                            </p>
                            <p className="mt-1 text-sm text-emerald-400">
                                +{bestProgress.progressKg} kg
                            </p>
                            <p className="mt-2 text-xs text-zinc-500">
                                De {bestProgress.firstWeight} kg a {bestProgress.bestWeight} kg
                            </p>
                        </>
                    ) : (
                        <p className="mt-3 text-xl font-semibold text-zinc-100">
                            Sin datos
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="text-sm font-medium text-zinc-400">Último registro</h2>

                    {latestRecord ? (
                        <>
                            <p className="mt-3 text-xl font-semibold text-zinc-100">
                                {latestRecord.exerciseName}
                            </p>
                            <p className="mt-1 text-sm text-zinc-300">
                                {latestRecord.weight} kg
                            </p>
                            <p className="mt-2 text-xs text-zinc-500">
                                {latestRecord.performedAt
                                    ? new Date(latestRecord.performedAt).toLocaleDateString(
                                        'es-AR'
                                    )
                                    : 'Sin fecha'}
                            </p>
                        </>
                    ) : (
                        <p className="mt-3 text-xl font-semibold text-zinc-100">
                            Sin datos
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="text-sm font-medium text-zinc-400">Ejercicio destacado</h2>

                    {bestProgress ? (
                        <>
                            <p className="mt-3 text-xl font-semibold text-zinc-100">
                                {bestProgress.exerciseName}
                            </p>
                            <p className="mt-1 text-sm text-zinc-300">
                                Mejor evolución del alumno
                            </p>
                        </>
                    ) : (
                        <p className="mt-3 text-xl font-semibold text-zinc-100">
                            Sin datos
                        </p>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
                    <div className="border-b border-zinc-800 px-6 py-4">
                        <h2 className="text-lg font-semibold text-zinc-100">
                            PRs recientes
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                            Últimos registros pesados del alumno
                        </p>
                    </div>

                    {recentPRs.length === 0 ? (
                        <div className="px-6 py-6 text-sm text-zinc-400">
                            Todavía no hay registros recientes.
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {recentPRs.slice(0, 6).map((pr, index) => (
                                <div
                                    key={`${pr.exerciseName}-${pr.performedAt}-${index}`}
                                    className="flex items-center justify-between px-6 py-4"
                                >
                                    <div>
                                        <div className="font-medium text-zinc-100">
                                            {pr.exerciseName}
                                        </div>
                                        <div className="mt-1 text-sm text-zinc-400">
                                            {pr.performedAt
                                                ? new Date(pr.performedAt).toLocaleDateString(
                                                    'es-AR'
                                                )
                                                : 'Sin fecha'}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-semibold text-zinc-100">
                                            {pr.weight} kg
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
                    <div className="border-b border-zinc-800 px-6 py-4">
                        <h2 className="text-lg font-semibold text-zinc-100">
                            Top progresos
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                            Ejercicios donde más progresó
                        </p>
                    </div>

                    {topProgress.length === 0 ? (
                        <div className="px-6 py-6 text-sm text-zinc-400">
                            Todavía no hay progresos calculables.
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {topProgress.map((item, index) => (
                                <div
                                    key={`${item.exerciseName}-${index}`}
                                    className="flex items-center justify-between px-6 py-4"
                                >
                                    <div>
                                        <div className="font-medium text-zinc-100">
                                            {item.exerciseName}
                                        </div>
                                        <div className="mt-1 text-sm text-zinc-400">
                                            De {item.firstWeight} kg a {item.bestWeight} kg
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-semibold text-emerald-400">
                                            +{item.progressKg} kg
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}