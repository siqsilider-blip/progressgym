import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { assignTemplateAction } from './actions'
import BulkAssignTemplate from './BulkAssignTemplate'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

type PageProps = {
    params: Promise<{
        routineId: string
    }>
}

type StudentRow = {
    id: string
    first_name: string | null
    last_name: string | null
}

export default async function AssignTemplateToStudentPage(props: PageProps) {
    const params = await props.params;
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
        <div className="mx-auto max-w-2xl space-y-4 px-4 pb-24 text-foreground md:p-6">
            <DashboardPageHeader
                title="Asignar template"
                subtitle={template.name ?? 'Template'}
                backHref={`/dashboard/routines/${params.routineId}`}
            />

            {studentList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Todavía no tenés alumnos cargados.
                </p>
            ) : (
                <BulkAssignTemplate
                    templateId={params.routineId}
                    students={studentList.map((student) => ({
                        id: student.id,
                        name: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno sin nombre',
                        hasActiveProgram: activeStudentIds.has(student.id),
                    }))}
                    assignAction={assignTemplateAction}
                />
            )}
        </div>
    )
}
