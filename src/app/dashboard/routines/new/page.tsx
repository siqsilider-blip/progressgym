import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createRoutine } from './actions'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'
import { getServerUser } from '@/lib/auth/server'

type PageProps = {
    searchParams: Promise<{
        studentId?: string
    }>
}

function UnavailableRoutineForm({ message }: { message: string }) {
    return (
        <TrainerPageShell notebook width="form" className="space-y-4 lg:space-y-7">
            <DashboardPageHeader notebook title="Nueva rutina" backHref="/dashboard/routines" />
            <p className="border-y border-border py-4 text-sm text-muted-foreground">{message}</p>
        </TrainerPageShell>
    )
}

export default async function NewRoutinePage(props: PageProps) {
    const searchParams = await props.searchParams;
    const supabase = await createClient()
    const [user, profile] = await Promise.all([
        getServerUser(),
        getTrainerProfile(),
    ])

    if (!user) {
        redirect('/login')
    }

    const studentId = searchParams.studentId

    if (!studentId) {
        return <UnavailableRoutineForm message="Seleccioná un alumno desde Rutinas para continuar." />
    }

    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('id', studentId)
        .eq('trainer_id', user.id)
        .single()

    if (studentError || !student) {
        return <UnavailableRoutineForm message="No encontramos al alumno seleccionado." />
    }

    const defaultRoutineDays = profile?.default_routine_days ?? 4
    const studentName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()

    return (
        <TrainerPageShell notebook width="form" className="space-y-4 lg:space-y-7">
            <DashboardPageHeader
                notebook
                title="Nueva rutina"
                subtitle={`Para ${studentName}`}
                backHref="/dashboard/routines"
            />

            <form
                action={createRoutine}
                className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-4 lg:space-y-5 lg:rounded-none lg:border-x-0 lg:bg-transparent lg:px-0 lg:py-5"
            >
                <input type="hidden" name="studentId" value={studentId} />

                <div>
                    <label htmlFor="new-routine-name" className="text-sm font-medium text-foreground">Nombre de la rutina</label>
                    <input
                        id="new-routine-name"
                        name="name"
                        required
                        placeholder="Ej: Rutina hipertrofia"
                        defaultValue={`Rutina ${defaultRoutineDays} días`}
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                    />
                </div>

                <div>
                    <label htmlFor="new-routine-days" className="text-sm font-medium text-foreground">Cantidad de días</label>
                    <select
                        id="new-routine-days"
                        name="days_count"
                        required
                        defaultValue={String(defaultRoutineDays)}
                        className="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring lg:max-w-52"
                    >
                        <option value="1">1 día</option>
                        <option value="2">2 días</option>
                        <option value="3">3 días</option>
                        <option value="4">4 días</option>
                        <option value="5">5 días</option>
                        <option value="6">6 días</option>
                    </select>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">
                    Al crear la rutina se preparan los días para que cargues los ejercicios en el planificador.
                </p>

                <button
                    type="submit"
                    className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:w-auto"
                >
                    Crear rutina
                </button>
            </form>
        </TrainerPageShell>
    )
}
