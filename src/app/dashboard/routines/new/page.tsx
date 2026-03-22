import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createRoutine } from './actions'
import { getTrainerProfile } from '@/lib/getTrainerProfile'

type PageProps = {
    searchParams: {
        studentId?: string
    }
}

export default async function NewRoutinePage({ searchParams }: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const studentId = searchParams.studentId

    if (!studentId) {
        return (
            <div className="px-4 pb-6 text-white md:p-8">
                <h1 className="text-2xl font-bold md:text-3xl">Nueva rutina</h1>
                <p className="mt-4 text-red-400">Falta seleccionar alumno.</p>
            </div>
        )
    }

    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('id', studentId)
        .single()

    if (studentError || !student) {
        return (
            <div className="px-4 pb-6 text-white md:p-8">
                <h1 className="text-2xl font-bold md:text-3xl">Nueva rutina</h1>
                <p className="mt-4 text-red-400">Alumno no encontrado.</p>
            </div>
        )
    }

    const profile = await getTrainerProfile()
    const defaultRoutineDays = profile?.default_routine_days ?? 4
    const studentName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()

    return (
        <div className="px-4 pb-6 text-white md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-start md:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                        Rutinas
                    </p>

                    <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                        Nueva rutina
                    </h1>

                    <p className="mt-2 text-sm text-zinc-400">
                        Crear rutina para {studentName}
                    </p>
                </div>

                <Link
                    href="/dashboard/routines"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 transition hover:bg-zinc-800 md:w-auto"
                >
                    ← Volver
                </Link>
            </div>

            <form
                action={createRoutine}
                className="max-w-xl space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6"
            >
                <input type="hidden" name="studentId" value={studentId} />

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Alumno
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                        {studentName}
                    </p>
                </div>

                <div>
                    <label className="text-sm text-zinc-400">Nombre de la rutina</label>
                    <input
                        name="name"
                        required
                        placeholder="Ej: Rutina hipertrofia"
                        defaultValue={`Rutina ${defaultRoutineDays} días`}
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                    />
                </div>

                <div>
                    <label className="text-sm text-zinc-400">Cantidad de días</label>
                    <select
                        name="days_count"
                        required
                        defaultValue={String(defaultRoutineDays)}
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                    >
                        <option value="1">1 día</option>
                        <option value="2">2 días</option>
                        <option value="3">3 días</option>
                        <option value="4">4 días</option>
                        <option value="5">5 días</option>
                        <option value="6">6 días</option>
                    </select>
                </div>

                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                    <p className="text-sm font-medium text-white">
                        Se van a crear automáticamente los días de la rutina.
                    </p>
                    <p className="mt-1 text-xs text-indigo-200/80">
                        Después vas a poder entrar a cada día y agregar ejercicios.
                    </p>
                </div>

                <button
                    type="submit"
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                    Crear rutina
                </button>
            </form>
        </div>
    )
}