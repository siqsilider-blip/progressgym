import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import Link from 'next/link'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import { getStudentAppContext } from '@/lib/auth/student'
import AccountDeletionCard from '@/components/account/AccountDeletionCard'
import { getActiveStudentRoutine } from '@/lib/getActiveStudentRoutine'
import { Bell, CalendarDays, ChevronRight, MessageCircle, Target, Trophy } from 'lucide-react'

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
    const assignment = studentId ? await getActiveStudentRoutine(supabase, studentId) : null

    const { data: routine } = assignment?.routineId ? await supabase
        .from('routines')
        .select('name')
        .eq('id', assignment.routineId)
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
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-sm font-black text-primary">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">{fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">{profile?.email ?? user.email}</p>
                            {memberSince && (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    Miembro desde {memberSince}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <section className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="border-b border-border px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-wider text-brand-soft">Mi plan</p>
                        {routine?.name && <p className="mt-1 text-base font-black text-foreground">{routine.name}</p>}
                        {trainer?.name && <p className="mt-1 text-sm text-muted-foreground">Con {trainer.name}</p>}
                    </div>
                    <Link href="/app/rutina" prefetch className="flex min-h-14 items-center gap-3 border-b border-border px-4 text-sm font-bold text-foreground">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <span className="flex-1">Ver mi rutina</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <Link href="/app/messages" prefetch className="flex min-h-14 items-center gap-3 px-4 text-sm font-bold text-foreground">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        <span className="flex-1">Escribir a mi entrenador</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </section>

                <section className="overflow-hidden rounded-2xl border border-border bg-card">
                    <p className="border-b border-border px-4 py-3 text-xs font-black uppercase tracking-wider text-brand-soft">Mi cuenta</p>
                    <Link href="/app/logros" prefetch className="flex min-h-14 items-center gap-3 border-b border-border px-4 text-sm font-semibold text-foreground">
                        <Trophy className="h-5 w-5 text-primary" />
                        <span className="flex-1">Mis logros</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <Link href="/app/notifications" prefetch className="flex min-h-14 items-center gap-3 border-b border-border px-4 text-sm font-semibold text-foreground">
                        <Bell className="h-5 w-5 text-primary" />
                        <span className="flex-1">Avisos</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <Link href="/app/onboarding" prefetch className="flex min-h-14 items-center gap-3 px-4 text-sm font-semibold text-foreground">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="flex-1">Objetivos y disponibilidad</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </section>

                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 py-1 text-[11px] text-muted-foreground">
                    <Link href="/privacy">Privacidad</Link>
                    <Link href="/terms">Términos</Link>
                    <Link href="/support">Soporte</Link>
                </div>

                <AccountDeletionCard compact />

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
