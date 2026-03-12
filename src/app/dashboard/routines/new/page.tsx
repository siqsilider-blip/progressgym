import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createRoutine } from './actions'

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
            <div className="p-8 text-white">
                <h1 className="text-3xl font-bold">Nueva rutina</h1>
                <p className="mt-4 text-red-400">Falta seleccionar alumno.</p>
            </div>
        )
    }

    const { data: student, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('id', studentId)
        .single()

    if (error || !student) {
        return (
            <div className="p-8 text-white">
                <h1 className="text-3xl font-bold">Nueva rutina</h1>
                <p className="mt-4 text-red-400">Alumno no encontrado.</p>
            </div>
        )
    }

    return (
        <div className="p-8 text-white">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Nueva rutina</h1>
                    <p className="text-zinc-400">
                        Crear rutina para {student.first_name} {student.last_name}
                    </p>
                </div>

                <Link
                    href="/dashboard/routines"
                    className="text-sm text-zinc-300 hover:text-white"
                >
                    ← Volver
                </Link>
            </div>

            <form
                action={createRoutine}
                className="max-w-xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
            >
                <input type="hidden" name="studentId" value={studentId} />

                <div>
                    <label className="text-sm text-zinc-400">Nombre de la rutina</label>
                    <input
                        name="name"
                        required
                        placeholder="Ej: Rutina hipertrofia"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white"
                    />
                </div>

                <div>
                    <label className="text-sm text-zinc-400">Cantidad de días</label>
                    <select
                        name="days_count"
                        required
                        defaultValue="4"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white"
                    >
                        <option value="1">1 día</option>
                        <option value="2">2 días</option>
                        <option value="3">3 días</option>
                        <option value="4">4 días</option>
                        <option value="5">5 días</option>
                        <option value="6">6 días</option>
                    </select>
                </div>

                <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                    Crear rutina
                </button>
            </form>
        </div>
    )
}