import { redirect } from 'next/navigation'
import { getStudentBadges } from '@/app/dashboard/students/getStudentBadges'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import { getStudentAppContext } from '@/lib/auth/student'

export default async function AppLogrosPage() {
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const studentId = context.profile.student_id
    if (!studentId) redirect('/app')

    const badges = await getStudentBadges(studentId)
    const unlocked = badges.filter(b => b.unlocked)
    const locked = badges.filter(b => !b.unlocked)

    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-lg">

                {/* Header */}
                <div className="mb-4">
                    <StudentPageHeader
                        title="Logros"
                        subtitle="Tu constancia y avances"
                        back
                        action={<span className="text-sm font-bold text-amber-400">{unlocked.length} de {badges.length}</span>}
                    />
                </div>

                {/* Barra de progreso global */}
                <div className="mb-4 rounded-xl border border-border bg-card p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-card-foreground">
                            Progreso general
                        </p>
                        <p className="text-xs font-bold text-amber-400">
                            {unlocked.length}/{badges.length}
                        </p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                            style={{ width: `${Math.round((unlocked.length / badges.length) * 100)}%` }}
                        />
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                        {badges.length - unlocked.length} logros por desbloquear
                    </p>
                </div>

                {/* Desbloqueados */}
                {unlocked.length > 0 && (
                    <div className="mb-5">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Desbloqueados ✅
                        </p>
                        <div className="space-y-2">
                            {unlocked.map((badge) => (
                                <div
                                    key={badge.id}
                                    className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-xl">
                                        {badge.emoji}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-card-foreground">
                                            {badge.title}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {badge.description}
                                        </p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-500">
                                        ✓
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Por desbloquear */}
                {locked.length > 0 && (
                    <div>
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Por desbloquear
                        </p>
                        <div className="space-y-2">
                            {locked.map((badge) => (
                                <div
                                    key={badge.id}
                                    className="rounded-xl border border-border bg-card p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl opacity-40 grayscale">
                                            {badge.emoji}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-card-foreground opacity-60">
                                                {badge.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {badge.description}
                                            </p>
                                        </div>
                                    </div>

                                    {badge.progress !== undefined && badge.progress > 0 && (
                                        <div className="mt-3">
                                            <div className="mb-1 flex items-center justify-between">
                                                {badge.progressLabel && (
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {badge.progressLabel}
                                                    </p>
                                                )}
                                                <p className="ml-auto text-[10px] font-medium text-indigo-400">
                                                    {Math.round(badge.progress)}%
                                                </p>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                                    style={{ width: `${badge.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {badge.progress === 0 && badge.progressLabel && (
                                        <p className="mt-2 text-[10px] text-muted-foreground">
                                            {badge.progressLabel}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
