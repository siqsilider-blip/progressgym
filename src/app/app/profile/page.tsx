import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import { getStudentExerciseProgress } from '@/app/dashboard/students/getStudentExerciseProgress'
import { getStudentSessionHistory } from '@/app/dashboard/students/getStudentSessionHistory'
import { formatWeight, type WeightUnit } from '@/lib/weight'

export default async function AppProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, student_id, created_at')
        .eq('id', user.id)
        .single()

    const studentId = profile?.student_id
    const { data: student } = studentId ? await supabase
        .from('students')
        .select('first_name, last_name, trainer_id, created_at')
        .eq('id', studentId)
        .single() : { data: null }

    // Trainer info
    const { data: trainer } = student?.trainer_id ? await supabase
        .from('profiles')
        .select('name, weight_unit')
        .eq('id', student.trainer_id)
        .single() : { data: null }

    const weightUnit = (trainer?.weight_unit ?? 'kg') as WeightUnit

    // Rutina
    const { data: assignment } = studentId ? await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', studentId)
        .maybeSingle() : { data: null }

    const { data: routine } = assignment?.routine_id ? await supabase
        .from('routines')
        .select('name')
        .eq('id', assignment.routine_id)
        .single() : { data: null }

    // Stats
    const [progressData, sessions] = await Promise.all([
        studentId ? getStudentExerciseProgress(studentId) : [],
        studentId ? getStudentSessionHistory(studentId, 50) : [],
    ])

    const fullName = student
        ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
        : profile?.name ?? 'Alumno'

    const totalProgress = progressData.reduce((acc, e) => acc + e.progressKg, 0)
    const totalSessions = sessions.length
    const totalSets = sessions.reduce((acc, s) => acc + s.totalSets, 0)

    const avgDuration = sessions.filter(s => s.durationSeconds).length > 0
        ? Math.round(
            sessions.filter(s => s.durationSeconds)
                .reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0) /
            sessions.filter(s => s.durationSeconds).length / 60
        )
        : null

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

                <h1 className="text-2xl font-black text-foreground">Perfil</h1>

                {/* ── Card principal ── */}
                <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-500/10">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black backdrop-blur">
                            {initials}
                        </div>
                        <div>
                            <p className="text-lg font-bold">{fullName}</p>
                            <p className="text-sm text-indigo-200">{profile?.email ?? user.email}</p>
                            {memberSince && (
                                <p className="mt-0.5 text-[10px] text-indigo-300">
                                    Miembro desde {memberSince}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Stats globales ── */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-border bg-card p-4 text-center">
                        <p className="text-3xl font-black text-indigo-400">{totalSessions}</p>
                        <p className="text-[10px] text-muted-foreground">Sesiones totales</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4 text-center">
                        <p className="text-3xl font-black text-emerald-400">{totalSets}</p>
                        <p className="text-[10px] text-muted-foreground">Series totales</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4 text-center">
                        <p className="text-3xl font-black text-amber-400">
                            +{totalProgress > 0 ? totalProgress.toFixed(0) : '0'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Progreso ({weightUnit})</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4 text-center">
                        <p className="text-3xl font-black text-violet-400">
                            {avgDuration ? `${avgDuration}m` : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Duración media</p>
                    </div>
                </div>

                {/* ── Info del entrenador ── */}
                {trainer?.name && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Mi entrenador
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-500">
                                {trainer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-card-foreground">{trainer.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    Unidad de peso: {weightUnit.toUpperCase()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Rutina actual ── */}
                {routine?.name && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Rutina actual
                        </p>
                        <p className="mt-1.5 text-sm font-bold text-card-foreground">{routine.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {progressData.length} ejercicios con progreso registrado
                        </p>
                    </div>
                )}

                {/* ── Ejercicios destacados ── */}
                {progressData.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Top ejercicios
                        </p>
                        <div className="mt-3 space-y-2">
                            {progressData.slice(0, 3).map((ex, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                        </span>
                                        <div>
                                            <p className="text-xs font-medium text-card-foreground">{ex.exerciseName}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {ex.firstWeight}{weightUnit} → {ex.bestWeight}{weightUnit}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-emerald-500">+{ex.progressKg}{weightUnit}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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