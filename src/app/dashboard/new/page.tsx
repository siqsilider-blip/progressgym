import Link from 'next/link'
import { ArrowLeft, ChevronRight, ClipboardList, UserPlus, Users } from 'lucide-react'

export default function NewDashboardPage() {
    return (
        <div className="p-4 md:p-8">
            <div className="mx-auto max-w-2xl pt-4">
                <div className="mb-8 text-left">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al dashboard
                    </Link>

                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-4xl">
                        Nuevo
                    </h1>

                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Elegí qué querés crear dentro de ProgressGym.
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        href="/dashboard/students/new"
                        className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-indigo-500/40 dark:hover:bg-zinc-900"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <UserPlus className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    Nuevo alumno
                                </p>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Creá un alumno para asignarle rutinas y seguir su progreso.
                                </p>
                            </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:text-indigo-500" />
                    </Link>

                    <Link
                        href="/dashboard/contacts/new"
                        className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-indigo-500/40 dark:hover:bg-zinc-900"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Users className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    Nuevo contacto
                                </p>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Registrá un lead o potencial alumno para hacer seguimiento.
                                </p>
                            </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:text-emerald-500" />
                    </Link>

                    <Link
                        href="/dashboard/routines"
                        className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-indigo-500/40 dark:hover:bg-zinc-900"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <ClipboardList className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    Nueva rutina
                                </p>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Elegí un alumno y empezá a crear o editar su rutina.
                                </p>
                            </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:text-amber-500" />
                    </Link>
                </div>
            </div>
        </div>
    )
}