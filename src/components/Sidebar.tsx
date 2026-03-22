import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
    Home,
    Users,
    Dumbbell,
    Settings,
    LogOut,
    ClipboardList,
    Plus,
} from 'lucide-react'

type SidebarProps = {
    theme?: 'dark' | 'light'
}

export default async function Sidebar({
    theme = 'dark',
}: SidebarProps) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const isLight = theme === 'light'

    const baseItem = isLight
        ? 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900'
        : 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white'

    const activeItem = isLight
        ? 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium bg-zinc-900 text-white'
        : 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium bg-white text-black'

    async function signOut() {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/login')
    }

    return (
        <>
            <aside
                className={`hidden md:flex md:w-72 md:flex-col md:border-r ${isLight
                        ? 'border-zinc-200 bg-white text-zinc-900'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-100'
                    }`}
            >
                <div className="border-b border-inherit px-6 py-6">
                    <Link href="/dashboard" className="block">
                        <h1 className="text-2xl font-bold tracking-tight">
                            ProgressGym
                        </h1>
                        <p
                            className={`mt-1 text-sm ${isLight ? 'text-zinc-500' : 'text-zinc-400'
                                }`}
                        >
                            Panel del entrenador
                        </p>
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-4">
                    <div className="space-y-1">
                        <Link href="/dashboard" className={activeItem}>
                            <Home className="h-4 w-4" />
                            Dashboard
                        </Link>

                        <Link href="/dashboard/students" className={baseItem}>
                            <Users className="h-4 w-4" />
                            Alumnos
                        </Link>

                        <Link href="/dashboard/students/new" className={baseItem}>
                            <Plus className="h-4 w-4" />
                            Nuevo alumno
                        </Link>

                        <Link href="/dashboard/routines" className={baseItem}>
                            <ClipboardList className="h-4 w-4" />
                            Rutinas
                        </Link>

                        <Link href="/dashboard/exercises" className={baseItem}>
                            <Dumbbell className="h-4 w-4" />
                            Ejercicios
                        </Link>

                        <Link href="/dashboard/settings" className={baseItem}>
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                    </div>
                </nav>

                <div className="border-t border-inherit p-3">
                    <form action={signOut}>
                        <button type="submit" className={baseItem + ' w-full'}>
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                        </button>
                    </form>
                </div>
            </aside>

            <div
                className={`fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b px-4 md:hidden ${isLight
                        ? 'border-zinc-200 bg-white/95 text-zinc-900'
                        : 'border-zinc-800 bg-zinc-950/95 text-zinc-100'
                    } backdrop-blur`}
            >
                <Link href="/dashboard" className="font-semibold tracking-tight">
                    ProgressGym
                </Link>

                <Link
                    href="/dashboard/settings"
                    className={`rounded-lg p-2 ${isLight ? 'hover:bg-zinc-100' : 'hover:bg-zinc-900'
                        }`}
                >
                    <Settings className="h-5 w-5" />
                </Link>
            </div>

            <nav
                className={`fixed inset-x-0 bottom-0 z-40 border-t md:hidden ${isLight
                        ? 'border-zinc-200 bg-white/95'
                        : 'border-zinc-800 bg-zinc-950/95'
                    } backdrop-blur`}
            >
                <div className="grid grid-cols-5">
                    <Link
                        href="/dashboard"
                        className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'
                            }`}
                    >
                        <Home className="h-4 w-4" />
                        <span>Inicio</span>
                    </Link>

                    <Link
                        href="/dashboard/students"
                        className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        <span>Alumnos</span>
                    </Link>

                    <Link
                        href="/dashboard/students/new"
                        className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] text-indigo-500"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Nuevo</span>
                    </Link>

                    <Link
                        href="/dashboard/routines"
                        className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'
                            }`}
                    >
                        <ClipboardList className="h-4 w-4" />
                        <span>Rutinas</span>
                    </Link>

                    <Link
                        href="/dashboard/exercises"
                        className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'
                            }`}
                    >
                        <Dumbbell className="h-4 w-4" />
                        <span>Ejercicios</span>
                    </Link>
                </div>
            </nav>
        </>
    )
}