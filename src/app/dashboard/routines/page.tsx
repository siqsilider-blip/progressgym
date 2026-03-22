import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentRoutineSelector from './StudentRoutineSelector'

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
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })

    if (studentsError) {
        return (
            <div className="p-8 text-zinc-900 dark:text-white">
                <h1 className="text-3xl font-bold tracking-tight">Rutinas</h1>
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
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
    let selectedStudentName = ''

    if (selectedStudentId) {
        const selectedStudent = students.find(
            (student) => student.id === selectedStudentId
        )

        selectedStudentName = selectedStudent
            ? `${selectedStudent.first_name} ${selectedStudent.last_name}`.trim()
            : ''

        const { data: assignment, error: assignmentError } = await supabase
            .from('student_routines')
            .select('id, routine_id')
            .eq('student_id', selectedStudentId)
            .maybeSingle()

        if (assignmentError) {
            throw new Error(assignmentError.message)
        }

        if (assignment?.routine_id) {
            const { data: routineData, error: routineError } = await supabase
                .from('routines')
                .select('id, student_id')
                .eq('id', assignment.routine_id)
                .eq('trainer_id', user.id)
                .eq('student_id', selectedStudentId)
                .maybeSingle()

            if (routineError) {
                throw new Error(routineError.message)
            }

            selectedRoutine = (routineData as Routine | null) ?? null
        }

        if (!selectedRoutine) {
            const { data: fallbackRoutine, error: fallbackError } = await supabase
                .from('routines')
                .select('id, student_id')
                .eq('trainer_id', user.id)
                .eq('student_id', selectedStudentId)
                .maybeSingle()

            if (fallbackError) {
                throw new Error(fallbackError.message)
            }

            selectedRoutine = (fallbackRoutine as Routine | null) ?? null

            if (selectedRoutine?.id) {
                if (assignment?.id) {
                    const { error: repairError } = await supabase
                        .from('student_routines')
                        .update({
                            routine_id: selectedRoutine.id,
                            assigned_at: new Date().toISOString(),
                        })
                        .eq('id', assignment.id)

                    if (repairError) {
                        throw new Error(repairError.message)
                    }
                } else {
                    const { error: insertError } = await supabase
                        .from('student_routines')
                        .insert({
                            student_id: selectedStudentId,
                            routine_id: selectedRoutine.id,
                            assigned_at: new Date().toISOString(),
                        })

                    if (insertError) {
                        throw new Error(insertError.message)
                    }
                }
            }
        }
    }

    return (
        <div className="p-8 text-zinc-900 dark:text-white">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Rutinas
                </h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Elegí un alumno y creá o editá su rutina.
                </p>
            </div>

            <div className="max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                <StudentRoutineSelector
                    students={students}
                    selectedStudentId={selectedStudentId}
                />

                {selectedStudentId && (
                    <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Rutina del alumno
                        </p>

                        <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedStudentName || 'Alumno'}
                        </p>

                        <div className="mt-4">
                            {selectedRoutine ? (
                                <div className="flex flex-wrap gap-3">
                                    <Link
                                        href={`/dashboard/routines/${selectedRoutine.id}`}
                                        className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                    >
                                        Editar rutina
                                    </Link>

                                    <Link
                                        href={`/dashboard/students/${selectedStudentId}/train`}
                                        className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                                    >
                                        Entrenar
                                    </Link>
                                </div>
                            ) : (
                                <Link
                                    href={`/dashboard/routines/new?studentId=${selectedStudentId}`}
                                    className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                                >
                                    Crear rutina
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}