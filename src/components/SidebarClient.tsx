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

    return (
        <>
            {/* ── Sidebar desktop ── */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:border-r border-white/[0.06] bg-[#07070a] text-white">
                <div className="border-b border-white/[0.06] px-6 py-6">
                    <Link href="/dashboard" className="block">
                        <div className="flex items-center gap-2.5">
                            <div
                                className="flex h-7 w-7 items-center justify-center rounded-lg"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 16px rgba(124,58,237,0.4)' }}
                            >
                                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-sm font-black tracking-tight text-white">Progrezzia</h1>
                                <p className="text-[10px] text-white/30">Panel del entrenador</p>
                            </div>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-4">
                    <div className="space-y-0.5">
                        {desktopNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = item.match(pathname)

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                                            ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                                            : 'text-white/40 hover:bg-white/[0.04] hover:text-white/80 border border-transparent'
                                        }`}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? 'text-violet-400' : ''}`} />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                </nav>

                <div className="border-t border-white/[0.06] p-3">
                    <Link
                        href="/dashboard/settings"
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all mb-1 ${pathname === '/dashboard/settings'
                                ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                                : 'text-white/40 hover:bg-white/[0.04] hover:text-white/80 border border-transparent'
                            }`}
                    >
                        <Settings className="h-4 w-4" />
                        Configuración
                    </Link>
                    <form action={signOutAction}>
                        <button
                            type="submit"
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 transition-all hover:bg-white/[0.04] hover:text-white/80 border border-transparent"
                        >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                        </button>
                    </form>
                </div>
            </aside>

            {/* ── Header mobile ── */}
            <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] px-4 md:hidden bg-[#07070a]/95 backdrop-blur">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div
                        className="flex h-6 w-6 items-center justify-center rounded-lg"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    >
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <span className="text-sm font-black text-white">Progrezzia</span>
                </Link>

                <Link
                    href="/dashboard/settings"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                    <Settings className="h-4 w-4" />
                </Link>
            </div>

            {/* ── Nav mobile bottom ── */}
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] md:hidden bg-[#07070a]/95 backdrop-blur">
                <div className="grid grid-cols-5">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = item.match(pathname)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${isActive
                                        ? 'text-violet-400'
                                        : 'text-white/30 hover:text-white/60'
                                    }`}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.5]' : ''}`} />
                                <span>{item.mobileLabel}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}