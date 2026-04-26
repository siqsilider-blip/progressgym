'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Users,
    LogOut,
    ClipboardList,
    Plus,
    Dumbbell,
    Settings,
} from 'lucide-react'

type SidebarClientProps = {
    theme?: 'dark' | 'light'
    signOutAction: () => Promise<void>
}

export default function SidebarClient({
    theme = 'dark',
    signOutAction,
}: SidebarClientProps) {
    const pathname = usePathname()
    const isLight = theme === 'light'

    const navItems = [
        {
            href: '/dashboard',
            label: 'Dashboard',
            mobileLabel: 'Inicio',
            icon: Home,
            match: (path: string) => path === '/dashboard',
        },
        {
            href: '/dashboard/students',
            label: 'Alumnos',
            mobileLabel: 'Alumnos',
            icon: Users,
            match: (path: string) =>
                path === '/dashboard/students' || path.startsWith('/dashboard/students/'),
        },
        {
            href: '/dashboard/new',
            label: 'Nuevo',
            mobileLabel: 'Nuevo',
            icon: Plus,
            match: (path: string) => path === '/dashboard/new',
        },
        {
            href: '/dashboard/routines',
            label: 'Rutinas',
            mobileLabel: 'Rutinas',
            icon: ClipboardList,
            match: (path: string) =>
                path === '/dashboard/routines' || path.startsWith('/dashboard/routines/'),
        },
        {
            href: '/dashboard/exercises',
            label: 'Ejercicios',
            mobileLabel: 'Ejercicios',
            icon: Dumbbell,
            match: (path: string) =>
                path === '/dashboard/exercises' || path.startsWith('/dashboard/exercises/'),
        },
    ]

    const desktopNavItems = navItems.filter((item) => item.label !== 'Nuevo')

    const baseItem = isLight
        ? 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900'
        : 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white'

    const activeItem = isLight
        ? 'flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white'
        : 'flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black'

    const mobileBase = isLight
        ? 'flex flex-col items-center justify-center gap-1 py-2 text-[11px] text-zinc-700'
        : 'flex flex-col items-center justify-center gap-1 py-2 text-[11px] text-zinc-300'

    const mobileActive =
        'flex flex-col items-center justify-center gap-1 py-2 text-[11px] text-indigo-500'

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
                        <h1 className="text-2xl font-bold tracking-tight">ProgressGym</h1>
                        <p className={`mt-1 text-sm ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Panel del entrenador
                        </p>
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-4">
                    <div className="space-y-1">
                        {desktopNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = item.match(pathname)

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={isActive ? activeItem : baseItem}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                </nav>

                <div className="border-t border-inherit p-3">
                    <form action={signOutAction}>
                        <button type="submit" className={`${baseItem} w-full`}>
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

                <Link href="/dashboard/settings" className={`flex h-8 w-8 items-center justify-center rounded-lg ${isLight ? 'text-zinc-500 hover:bg-zinc-100' : 'text-zinc-400 hover:bg-zinc-800'}`}>
                    <Settings className="h-4 w-4" />
                </Link>
            </div>

            <nav
                className={`fixed inset-x-0 bottom-0 z-40 border-t md:hidden ${isLight
                        ? 'border-zinc-200 bg-white/95'
                        : 'border-zinc-800 bg-zinc-950/95'
                    } backdrop-blur`}
            >
                <div className="grid grid-cols-5">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = item.match(pathname)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={isActive ? mobileActive : mobileBase}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{item.mobileLabel}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}