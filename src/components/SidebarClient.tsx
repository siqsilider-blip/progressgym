'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
    Home,
    Users,
    LogOut,
    ClipboardList,
    Plus,
    Dumbbell,
    Settings,
    MessageSquare,
    MessageCircle,
    Bell,
    Video,
} from 'lucide-react'

type SidebarClientProps = {
    signOutAction: () => Promise<void>
    unreadNotifications: number
    unreadMessages: number
}

const NOTEBOOK_SECTIONS = new Set(['students', 'notifications', 'routines', 'templates', 'exercises', 'contacts'])

export default function SidebarClient({
    signOutAction,
    unreadNotifications,
    unreadMessages,
}: SidebarClientProps) {
    const pathname = usePathname()
    const [pendingHref, setPendingHref] = useState<string | null>(null)
    const notebook = pathname === '/dashboard' || NOTEBOOK_SECTIONS.has(pathname.split('/')[2])

    useEffect(() => {
        setPendingHref(null)
    }, [pathname])

    const navItems = [
        {
            href: '/dashboard',
            label: 'Inicio',
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
            mobile: false,
            match: (path: string) => path === '/dashboard/new',
        },
        {
            href: '/dashboard/messages',
            label: 'Mensajes',
            mobileLabel: 'Mensajes',
            icon: MessageCircle,
            match: (path: string) =>
                path === '/dashboard/messages' || path.startsWith('/dashboard/messages/'),
        },
        {
            href: '/dashboard/technique-videos',
            label: 'Videos de técnica',
            mobileLabel: 'Técnica',
            icon: Video,
            mobile: false,
            match: (path: string) =>
                path === '/dashboard/technique-videos' || path.startsWith('/dashboard/technique-videos/'),
        },
        {
            href: '/dashboard/notifications',
            label: 'Avisos',
            mobileLabel: 'Avisos',
            icon: Bell,
            mobile: false,
            match: (path: string) => path === '/dashboard/notifications',
        },
        {
            href: '/dashboard/routines',
            label: 'Rutinas',
            mobileLabel: 'Rutinas',
            icon: ClipboardList,
            match: (path: string) =>
                path === '/dashboard/routines' || path.startsWith('/dashboard/routines/') ||
                path === '/dashboard/templates' || path.startsWith('/dashboard/templates/'),
        },
        {
            href: '/dashboard/exercises',
            label: 'Ejercicios',
            mobileLabel: 'Ejercicios',
            icon: Dumbbell,
            match: (path: string) =>
                path === '/dashboard/exercises' || path.startsWith('/dashboard/exercises/'),
        },
        {
            href: '/dashboard/contacts',
            label: 'Contactos',
            mobileLabel: 'Contactos',
            icon: MessageSquare,
            mobile: false,
            match: (path: string) =>
                path === '/dashboard/contacts' || path.startsWith('/dashboard/contacts/'),
        },
    ]

    const desktopNavItems = navItems.filter((item) => item.label !== 'Nuevo')
    const desktopItemLayout = notebook
        ? 'gap-2 rounded-md px-2.5 py-2 text-[13px]'
        : 'gap-3 rounded-xl px-3 py-2.5 text-sm'
    const desktopSelectedColors = notebook
        ? 'border-transparent bg-sidebar-accent text-brand-soft'
        : 'border-sidebar-primary/20 bg-sidebar-accent text-sidebar-primary'

    return (
        <>
            {/* ── Sidebar desktop ── */}
            <aside className={`hidden border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r ${notebook ? 'lg:w-44 xl:w-46 2xl:w-52' : 'lg:w-64'}`}>
                <div className={notebook ? 'px-4 pb-4 pt-6' : 'border-b border-sidebar-border px-6 py-6'}>
                    <Link href="/dashboard" prefetch className="block">
                        <div className="flex items-center gap-2.5">
                            <div
                                className={`flex shrink-0 items-center justify-center rounded-lg ${notebook ? 'size-8 bg-primary text-primary-foreground' : 'size-7 text-[#111111]'}`}
                                style={notebook ? undefined : { background: 'linear-gradient(135deg, #c98796, #e9a0ad)', boxShadow: '0 0 16px rgba(201,135,150,0.4)' }}
                            >
                                <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-black tracking-tight text-sidebar-foreground">Progrezzia</p>
                                <p className={`text-muted-foreground ${notebook ? 'whitespace-nowrap text-[11px] leading-tight' : 'text-[10px]'}`}>Panel del entrenador</p>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className={notebook ? 'px-3 pb-1' : 'border-b border-sidebar-border px-3 py-3'}>
                    <Link
                        href="/dashboard/new"
                        prefetch
                        className={`flex items-center justify-center gap-2 text-xs transition ${notebook
                            ? 'h-9 rounded-md border border-sidebar-border font-semibold text-sidebar-foreground hover:bg-sidebar-accent'
                            : 'h-10 rounded-xl bg-primary font-bold text-primary-foreground hover:brightness-110'}`}
                    >
                        <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                        Nuevo
                    </Link>
                </div>

                <nav aria-label="Panel del entrenador" className={notebook ? 'flex-1 px-2.5 py-3' : 'flex-1 px-3 py-4'}>
                    <div className="space-y-0.5">
                        {desktopNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = item.match(pathname)
                            const isPending = pendingHref === item.href

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch
                                    onClick={() => setPendingHref(item.href)}
                                    aria-busy={isPending}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`flex items-center border font-medium transition-colors ${desktopItemLayout} ${isActive || isPending
                                            ? desktopSelectedColors
                                            : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                                        }`}
                                >
                                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                                    {item.label}
                                    {item.label === 'Mensajes' && unreadMessages > 0 && (
                                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{Math.min(unreadMessages, 99)}</span>
                                    )}
                                    {item.label === 'Avisos' && unreadNotifications > 0 && (
                                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground">{Math.min(unreadNotifications, 99)}</span>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </nav>

                <div className={notebook ? 'border-t border-sidebar-border px-2.5 py-3' : 'border-t border-sidebar-border p-3'}>
                    <Link
                        href="/dashboard/settings"
                        prefetch
                        aria-current={pathname === '/dashboard/settings' ? 'page' : undefined}
                        className={`mb-1 flex items-center border font-medium transition-colors ${desktopItemLayout} ${pathname === '/dashboard/settings'
                                ? desktopSelectedColors
                                : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            }`}
                    >
                        <Settings aria-hidden="true" className="size-4 shrink-0" />
                        Configuración
                    </Link>
                    <form action={signOutAction}>
                        <button
                            type="submit"
                            className={`flex w-full items-center border border-transparent font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${desktopItemLayout}`}
                        >
                            <LogOut aria-hidden="true" className="size-4 shrink-0" />
                            Cerrar sesión
                        </button>
                    </form>
                </div>
            </aside>

            {/* ── Header mobile ── */}
            <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar/95 px-4 backdrop-blur lg:hidden">
                <Link href="/dashboard" prefetch className="flex items-center gap-2">
                    <div
                        className="flex h-6 w-6 items-center justify-center rounded-lg"
                        style={{ background: 'linear-gradient(135deg, #c98796, #e9a0ad)' }}
                    >
                        <svg className="h-3 w-3 text-[#111111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <span className="text-sm font-black text-sidebar-foreground">Progrezzia</span>
                </Link>

                <div className="flex items-center gap-1">
                    <Link
                        href="/dashboard/notifications"
                        prefetch
                        aria-label="Avisos"
                        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    >
                        <Bell className="h-4 w-4" />
                        {unreadNotifications > 0 && (
                            <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[7px] font-black text-primary-foreground">
                                {Math.min(unreadNotifications, 9)}
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/dashboard/settings"
                        prefetch
                        aria-label="Configuración"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    >
                        <Settings className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            {/* ── Nav mobile bottom ── */}
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 backdrop-blur lg:hidden">
                <div className="grid grid-cols-5">
                    {navItems.filter((item) => item.mobile !== false).map((item) => {
                        const Icon = item.icon
                        const isActive = item.match(pathname)
                        const isPending = pendingHref === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch
                                onClick={() => setPendingHref(item.href)}
                                aria-busy={isPending}
                                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${isActive || isPending
                                        ? 'text-sidebar-primary'
                                        : 'text-muted-foreground hover:text-sidebar-foreground'
                                    }`}
                            >
                                <span className="relative">
                                    <Icon className={`h-4 w-4 ${isActive || isPending ? 'stroke-[2.5]' : ''} ${isPending ? 'animate-pulse' : ''}`} />
                                    {item.label === 'Mensajes' && unreadMessages > 0 && (
                                        <span className="absolute -right-2 -top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[7px] font-black text-white">{Math.min(unreadMessages, 9)}</span>
                                    )}
                                </span>
                                <span>{item.mobileLabel}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
