import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTrainerProfile } from '@/lib/getTrainerProfile'

type Student = {
    id: string
    first_name: string | null
    last_name: string | null
}

type Routine = {
    id: string
    student_id: string
}

type PageProps = {
    searchParams?: {
        studentId?: string
    }
}

export default async function RoutinesPage({ searchParams }: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const selectedStudentId = searchParams?.studentId ?? ''

    const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .order('created_at', { ascending: false })

    if (studentsError) {
        return (
            <div className="p-8 text-white">
                <h1 className="text-3xl font-bold tracking-tight">Rutinas</h1>
                <div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
                    {studentsError.message}
                </div>
            </div>
        )
    }

    const students = ((studentsData ?? []) as Student[]).map((student) => ({
        id: student.id,
        first_name: student.first_name ?? '',
        last_name: student.last_name ?? '',
    }))

    let selectedRoutine: Routine | null = null

    if (selectedStudentId) {
        const { data: routineData } = await supabase
            .from('routines')
            .select('id, student_id')
            .eq('trainer_id', user.id)
            .eq('student_id', selectedStudentId)
            .maybeSingle()

        selectedRoutine = (routineData as Routine | null) ?? null
    }

    return (
        <div className="p-8 text-white">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Rutinas</h1>
                <p className="mt-2 text-sm text-zinc-400">
                    Elegí un alumno y creá su rutina de 4 días (una sola por alumno).
                </p>
            </div>

            <div className="max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                <form method="GET" action="/dashboard/routines" className="space-y-5">
                    <div className="space-y-2">
                        <label
                            htmlFor="studentId"
                            className="text-sm font-medium text-zinc-300"
                        >
                            Alumno
                        </label>

                        <select
                            id="studentId"
                            name="studentId"
                            defaultValue={selectedStudentId}
                            className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
                        >
                            <option value="">Seleccionar...</option>
                            {students.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {student.first_name} {student.last_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                        Verificar rutina
                    </button>
                </form>

                {selectedStudentId && (
                    <div className="mt-5">
                        {selectedRoutine ? (
                            <Link
                                href={`/dashboard/routines/${selectedRoutine.id}`}
                                className="inline-flex rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                            >
                                Ver rutina actual
                            </Link>
                        ) : (
                            <Link
                                href={`/dashboard/routines/new?studentId=${selectedStudentId}`}
                                className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                            >
                                Crear rutina 4 días
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}