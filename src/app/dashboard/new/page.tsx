import Link from 'next/link'
import { ChevronRight, ClipboardList, UserPlus, Users } from 'lucide-react'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

export default function NewDashboardPage() {
    return (
        <div className="p-4 pb-24 md:p-6">
            <div className="mx-auto max-w-2xl space-y-4">
                <DashboardPageHeader
                    title="Nuevo"
                    subtitle="Elegí qué querés crear"
                    backHref="/dashboard"
                />

                <div className="space-y-2">
                    <Link
                        href="/dashboard/students/new"
                        className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-indigo-500/30 hover:bg-white/[0.04]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                                <UserPlus className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Nuevo alumno
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Creá un alumno para asignarle rutinas y seguir su progreso.
                                </p>
                            </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:text-indigo-500" />
                    </Link>

                    <Link
                        href="/dashboard/contacts/new"
                        className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-emerald-500/30 hover:bg-white/[0.04]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                                <Users className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Nuevo contacto
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Registrá un lead o potencial alumno para hacer seguimiento.
                                </p>
                            </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:text-emerald-500" />
                    </Link>

                    <Link
                        href="/dashboard/routines"
                        className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-amber-500/30 hover:bg-white/[0.04]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                                <ClipboardList className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Nueva rutina
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Elegí un alumno y empezá a crear o editar su rutina.
                                </p>
                            </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:text-amber-500" />
                    </Link>

                    <Link
                        href="/dashboard/templates/new"
                        className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-violet-500/30 hover:bg-white/[0.04]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                                <ClipboardList className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Nuevo template
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Creá un programa reutilizable para asignar a varios alumnos.
                                </p>
                            </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:text-purple-500" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
