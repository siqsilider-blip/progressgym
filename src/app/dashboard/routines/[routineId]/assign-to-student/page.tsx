import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { assignTemplateAction } from './actions'
import AssignTemplateButton from './AssignTemplateButton'

type PageProps = {
    params: {
        routineId: string
    }
}

type StudentRow = {
    id: string
    first_name: string | null
    last_name: string | null
}

export default async function AssignTemplateToStudentPage({ params }: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const { data: template, error: templateError } = await supabase
        .from('routines')
        .select('id, name, routine_kind')
        .eq('id', params.routineId)
        .eq('trainer_id', user.id)
        .single()

    if (templateError || !template || template.routine_kind !== 'template') {
        return (
            <div className="p-6 text-foreground">
                <h1 className="text-xl font-semibold">Template no encontrado.</h1>
            </div>
        )
    }

    const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('trainer_id', user.id)
        .order('first_name', { ascending: true })

    const studentList = (students as StudentRow[] | null) ?? []
    const studentIds = studentList.map((s) => s.id)

    // Se consulta quién ya tiene un programa activo para poder mostrar un
    // mensaje de confirmación específico (sección "Asignación vacía /
    // decisión consciente" del diseño) -- no es solo información de
    // contexto, cambia el texto que ve la persona antes de confirmar.
    let activeStudentIds = new Set<string>()

    if (studentIds.length > 0) {
        const { data: activeAssignments } = await supabase
            .from('student_routines')
            .select('student_id')
            .in('student_id', studentIds)
            .eq('status', 'active')

        activeStudentIds = new Set((activeAssignments ?? []).map((a) => a.student_id))
    }

    return (
        <div className="px-4 pb-24 text-foreground md:p-8">
            <div className="mb-6 flex flex-col gap-2 md:mb-8">
                <Link
                    href={`/dashboard/routines/${params.routineId}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    ← Volver al template
                </Link>

                <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                    Asignar template
                </p>

                <h1 className="text-2xl font-bold md:text-3xl">
                    {template.name ?? 'Template'}
                </h1>

                <p className="text-sm text-muted-foreground">
                    Elegí un alumno. Se va a crear una copia independiente de este
                    template para esa persona — editar el template después no va
                    a afectar esta copia.
                </p>
            </div>

            {studentList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Todavía no tenés alumnos cargados.
                </p>
            ) : (
                <div className="space-y-3">
                    {studentList.map((student) => {
                        const fullName =
                            `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() ||
                            'Alumno sin nombre'

                        const hasActiveProgram = activeStudentIds.has(student.id)

                        return (
                            <div
                                key={student.id}
                                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
                            >
                                <div className="min-w-0">
                                    <p className="text-base font-medium text-card-foreground">
                                        {fullName}
                                    </p>
                                    {hasActiveProgram && (
                                        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                                            Ya tiene un programa activo
                                        </p>
                                    )}
                                </div>

                                <AssignTemplateButton
                                    templateId={params.routineId}
                                    studentId={student.id}
                                    studentName={fullName}
                                    hasActiveProgram={hasActiveProgram}
                                    assignAction={assignTemplateAction}
                                />
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
