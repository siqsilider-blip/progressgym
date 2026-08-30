import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
    params: {
        studentId: string
    }
}

async function assignRoutine(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const studentId = formData.get('studentId') as string
    const routineId = formData.get('routineId') as string

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, trainer_id')
        .eq('id', studentId)
        .eq('trainer_id', user.id)
        .single()

    if (studentError || !student) {
        redirect('/dashboard/students')
    }

    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .select('id, student_id, trainer_id')
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .eq('student_id', studentId)
        .single()

    if (routineError || !routine) {
        throw new Error('La rutina elegida no pertenece a este alumno.')
    }

    // Fase 0B: asignación atómica (cierra la activa anterior, abre la
    // nueva) vía RPC en vez de chequeo + insert/update manual. Ver
    // assign_student_routine en fase0b_status_routine_kind.sql.
    const { error: assignError } = await supabase.rpc('assign_student_routine', {
        p_student_id: studentId,
        p_routine_id: routineId,
    })

    if (assignError) {
        throw new Error(assignError.message)
    }

    redirect(`/dashboard/students/${studentId}`)
}

export default async function AssignRoutinePage({ params }: PageProps) {
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
        .select('id, first_name, last_name, trainer_id')
        .eq('id', params.studentId)
        .eq('trainer_id', user.id)
        .single()

    if (studentError || !student) {
        redirect('/dashboard/students')
    }

    const { data: routines, error: routinesError } = await supabase
        .from('routines')
        .select('id, name')
        .eq('trainer_id', user.id)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })

    if (routinesError) {
        return (
            <div className="p-8 text-white">
                <h1 className="text-2xl font-bold">Asignar rutina</h1>
                <p className="mt-4 text-red-400">Error cargando rutinas.</p>
            </div>
        )
    }

    return (
        <div className="p-8 text-white">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Asignar rutina</h1>
                <p className="mt-2 text-sm text-zinc-400">
                    Asignar rutina a {student.first_name} {student.last_name}
                </p>
            </div>

            <div className="max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                {routines && routines.length > 0 ? (
                    <form action={assignRoutine} className="space-y-5">
                        <input type="hidden" name="studentId" value={student.id} />

                        <div className="space-y-2">
                            <label
                                htmlFor="routineId"
                                className="text-sm font-medium text-zinc-300"
                            >
                                Elegí una rutina
                            </label>

                            <select
                                id="routineId"
                                name="routineId"
                                required
                                className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
                            >
                                <option value="">Seleccionar rutina</option>
                                {routines.map((routine) => (
                                    <option key={routine.id} value={routine.id}>
                                        {routine.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                        >
                            Guardar asignación
                        </button>
                    </form>
                ) : (
                    <div className="space-y-3">
                        <p className="text-zinc-300">
                            Este alumno no tiene rutinas propias creadas todavía.
                        </p>
                        <a
                            href={`/dashboard/routines/new?studentId=${student.id}`}
                            className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                        >
                            Crear rutina para este alumno
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}