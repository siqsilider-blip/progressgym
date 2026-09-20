import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TemplatePicker from './TemplatePicker'

type PageProps = {
    params: Promise<{
        studentId: string
    }>
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

    redirect(`/dashboard/students/${studentId}?setup=invite`)
}

export default async function AssignRoutinePage(props: PageProps) {
    const params = await props.params;
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

    const [{ data: routines, error: routinesError }, { data: templates, error: templatesError }, { data: activeAssignment }] = await Promise.all([
        supabase
            .from('routines')
            .select('id, name')
            .eq('trainer_id', user.id)
            .eq('student_id', student.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('routines')
            .select('id, name, days_per_week')
            .eq('trainer_id', user.id)
            .eq('routine_kind', 'template')
            .order('created_at', { ascending: false }),
        supabase
            .from('student_routines')
            .select('routine_id')
            .eq('student_id', student.id)
            .eq('status', 'active')
            .maybeSingle(),
    ])

    if (routinesError || templatesError) {
        return (
            <div className="p-8 text-white">
                <h1 className="text-2xl font-bold">Asignar rutina</h1>
                <p className="mt-4 text-red-400">Error cargando rutinas.</p>
            </div>
        )
    }

    const templateList = templates ?? []
    const templateIds = templateList.map((template) => template.id)
    const weeksByTemplate = new Map<string, number>(templateIds.map((id) => [id, 0]))
    const exercisesByTemplate = new Map<string, number>(templateIds.map((id) => [id, 0]))

    if (templateIds.length > 0) {
        const [{ data: weeks }, { data: days }] = await Promise.all([
            supabase
                .from('routine_weeks')
                .select('routine_id')
                .in('routine_id', templateIds),
            supabase
                .from('routine_days')
                .select('id, routine_id')
                .in('routine_id', templateIds),
        ])

        for (const week of weeks ?? []) {
            weeksByTemplate.set(week.routine_id, (weeksByTemplate.get(week.routine_id) ?? 0) + 1)
        }

        const dayToTemplate = new Map((days ?? []).map((day) => [day.id, day.routine_id]))
        const dayIds = Array.from(dayToTemplate.keys())

        if (dayIds.length > 0) {
            const batches: string[][] = []
            for (let index = 0; index < dayIds.length; index += 200) {
                batches.push(dayIds.slice(index, index + 200))
            }

            const exerciseResults = await Promise.all(batches.map((batch) =>
                supabase
                    .from('routine_day_exercises')
                    .select('routine_day_id')
                    .in('routine_day_id', batch)
            ))

            for (const row of exerciseResults.flatMap((result) => result.data ?? [])) {
                const templateId = dayToTemplate.get(row.routine_day_id)
                if (templateId) {
                    exercisesByTemplate.set(templateId, (exercisesByTemplate.get(templateId) ?? 0) + 1)
                }
            }
        }
    }

    const studentName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

    return (
        <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24 text-white md:p-6">
            <DashboardPageHeader
                title="Asignar programa"
                subtitle={studentName}
                backHref={`/dashboard/students/${student.id}`}
            />

            {templateList.length > 0 ? (
                <TemplatePicker
                    studentId={student.id}
                    studentName={studentName}
                    hasActiveProgram={Boolean(activeAssignment?.routine_id)}
                    templates={templateList.map((template) => ({
                        id: template.id,
                        name: template.name ?? 'Template sin nombre',
                        daysPerWeek: template.days_per_week ?? 0,
                        weeks: weeksByTemplate.get(template.id) ?? 0,
                        exercises: exercisesByTemplate.get(template.id) ?? 0,
                    }))}
                />
            ) : (
                <div className="rounded-xl border border-dashed border-border p-5 text-center">
                    <p className="text-sm font-semibold text-foreground">Todavía no tenés templates</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Creá uno una sola vez y reutilizalo con todos tus alumnos.
                    </p>
                    <Link
                        href="/dashboard/templates/new"
                        className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
                    >
                        Crear primer template
                    </Link>
                </div>
            )}

            <details className="rounded-xl border border-border bg-card px-3.5 py-3 text-sm">
                <summary className="cursor-pointer font-semibold text-muted-foreground">Otras opciones</summary>
                <div className="mt-3 space-y-4 border-t border-border pt-3">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Crear una rutina desde cero</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Usalo solo si ningún template te sirve como base.
                        </p>
                        <Link
                            href={`/dashboard/routines/new?studentId=${student.id}`}
                            className="mt-2 inline-flex rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                            Crear desde cero
                        </Link>
                    </div>

                    {routines && routines.length > 0 && (
                        <div className="border-t border-border pt-3">
                            <p className="mb-2 text-sm font-semibold text-foreground">Reactivar una rutina anterior</p>
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
                                    className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground transition hover:bg-muted"
                                >
                                    Reactivar rutina
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </details>
        </div>
    )
}
