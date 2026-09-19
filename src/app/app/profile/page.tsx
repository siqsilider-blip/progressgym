import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import Link from 'next/link'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import { getStudentAppContext } from '@/lib/auth/student'

export default async function AppProfilePage() {
    const supabase = await createClient()
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const { user, profile } = context

    const studentId = profile?.student_id
    const { data: student } = studentId ? await supabase
        .from('students')
        .select('first_name, last_name, trainer_id, created_at')
        .eq('id', studentId)
        .single() : { data: null }

    // Trainer info
    const { data: trainer } = student?.trainer_id ? await supabase
        .from('profiles')
        .select('name')
        .eq('id', student.trainer_id)
        .single() : { data: null }

    // Rutina
    const { data: assignment } = studentId ? await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle() : { data: null }

    const { data: routine } = assignment?.routine_id ? await supabase
        .from('routines')
        .select('name')
        .eq('id', assignment.routine_id)
        .single() : { data: null }

    const fullName = student
        ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
        : profile?.name ?? 'Alumno'

    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        : null

    const initials = fullName
        .split(' ')
        .map((n: string) => n.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)

    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-lg space-y-4">

                <StudentPageHeader title="Perfil" subtitle="Cuenta y programa" />

                {/* ── Card principal ── */}
                <div className="rounded-xl border border-border bg-card p-3.5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-sm font-black text-indigo-400">
                            {initials}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">{fullName}</p>
                            <p className="text-xs text-muted-foreground">{profile?.email ?? user.email}</p>
                            {memberSince && (
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    Miembro desde {memberSince}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Info del entrenador ── */}
                {trainer?.name && (
                    <div className="rounded-xl border border-border bg-card p-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Mi entrenador
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-500">
                                {trainer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-card-foreground">{trainer.name}</p>
                                <p className="text-[10px] text-muted-foreground">Tu entrenador asignado</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Rutina actual ── */}
                {routine?.name && (
                    <div className="rounded-xl border border-border bg-card p-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Rutina actual
                        </p>
                        <p className="mt-1.5 text-sm font-bold text-card-foreground">{routine.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">Programa activo</p>
                    </div>
                )}

                <Link href="/app/logros" prefetch={true} className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-semibold text-foreground">
                    <span>Ver mis logros</span>
                    <span className="text-indigo-400">→</span>
                </Link>

                {/* ── Logout ── */}
                <form action={logout}>
                    <button
                        type="submit"
                        className="w-full rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3.5 text-sm font-medium text-red-500 transition hover:bg-red-500/10"
                    >
                        Cerrar sesión
                    </button>
                </form>
            </div>
        </div>
    )
}
