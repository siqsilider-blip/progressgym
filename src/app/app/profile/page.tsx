import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import Link from 'next/link'
import { NotebookLinkRow, NotebookRowText, StudentNotebookHeader, notebookGroup, notebookPage, notebookSectionTitle, notebookSummary } from '@/components/student/StudentNotebook'
import AppearanceOptions from '@/components/appearance/AppearanceOptions'
import { getStudentAppContext } from '@/lib/auth/student'
import AccountDeletionCard from '@/components/account/AccountDeletionCard'
import { getActiveStudentRoutine } from '@/lib/getActiveStudentRoutine'
import { APPEARANCES } from '@/lib/appearance'
import { getAppearance } from '@/lib/serverAppearance'
import { Bell, BookOpen, ChevronDown, LockKeyhole, LogOut, MessageCircle, Palette, Target, Trophy } from 'lucide-react'

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

    const appearance = await getAppearance()
    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        : null

    return (
        <main className={notebookPage}>
            <StudentNotebookHeader title={fullName || 'Perfil'} section="Mi perfil" subtitle={profile?.email ?? user.email} />

            <section className={notebookGroup} aria-labelledby="profile-training">
                <h2 id="profile-training" className={notebookSectionTitle}>Mi entrenamiento</h2>
                <div>
                    <NotebookLinkRow href="/app/rutina" icon={BookOpen} title="Mi programa" subtitle={routine?.name ?? undefined} />
                    <NotebookLinkRow href="/app/messages" prefetch={false} icon={MessageCircle} title="Escribir a mi entrenador" subtitle={trainer?.name ?? undefined} />
                    <NotebookLinkRow href="/app/onboarding" icon={Target} title="Objetivos y disponibilidad" subtitle="Ficha inicial" />
                    <NotebookLinkRow href="/app/logros" icon={Trophy} title="Mis logros" />
                </div>
            </section>

            <section className={notebookGroup} aria-labelledby="profile-preferences">
                <h2 id="profile-preferences" className={notebookSectionTitle}>Preferencias</h2>
                <div>
                    <details className="group">
                        <summary className={notebookSummary}>
                            <Palette className="size-4 shrink-0 text-brand-soft" aria-hidden="true" />
                            <NotebookRowText title="Apariencia" subtitle={APPEARANCES[appearance].label} />
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <AppearanceOptions appearance={appearance} notebook />
                    </details>
                    <NotebookLinkRow href="/app/notifications" icon={Bell} title="Avisos" />
                </div>
            </section>

            <section className={notebookGroup} aria-labelledby="profile-account">
                <h2 id="profile-account" className={notebookSectionTitle}>Cuenta</h2>
                <details className="group">
                    <summary className={notebookSummary}>
                        <LockKeyhole className="size-4 shrink-0 text-brand-soft" aria-hidden="true" />
                        <NotebookRowText title="Privacidad y cuenta" subtitle="Soporte y opciones de cuenta" />
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    {memberSince && <p className="mt-1 text-xs text-muted-foreground">Miembro desde {memberSince}</p>}
                    <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                        <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href="/privacy">Privacidad</Link>
                        <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href="/terms">Términos</Link>
                        <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href="/support">Soporte</Link>
                    </div>
                    <AccountDeletionCard compact />
                </details>
                <form action={logout} className="border-t border-border">
                    <button type="submit" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                        <LogOut className="size-4" aria-hidden="true" />Cerrar sesión
                    </button>
                </form>
            </section>
        </main>
    )
}
