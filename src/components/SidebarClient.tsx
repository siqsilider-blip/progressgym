'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Users,
    Activity,
    Settings,
    LogOut,
    Dumbbell,
    UserPlus,
} from 'lucide-react'
import { logout } from '@/app/auth/actions'

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Users },
    { name: 'Add Student', href: '/dashboard/students/new', icon: UserPlus },
    { name: 'Exercises', href: '/dashboard/exercises', icon: Activity },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

type SidebarClientProps = {
    profile: {
        display_name: string | null
        gym_name: string | null
    } | null
}

export default function SidebarClient({ profile }: SidebarClientProps) {
    const pathname = usePathname()

    return (
        <aside className="sticky top-0 flex h-screen w-64 flex-col items-stretch border-r border-zinc-800 bg-zinc-950/50 pt-6 backdrop-blur-md">
            <div className="mb-8 px-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-lg shadow-indigo-500/20">
                        <Dumbbell className="h-5 w-5 text-white" />
                    </div>

                    <div>
                        <div className="text-lg font-bold text-white">ProgressGym</div>
                        {(profile?.display_name || profile?.gym_name) && (
                            <div className="text-xs text-zinc-400">
                                {[profile?.display_name, profile?.gym_name]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                                ? 'bg-zinc-800/80 text-white'
                                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                                }`}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="mt-auto border-t border-zinc-800/60 p-4">
                <form action={logout}>
                    <button
                        type="submit"
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </form>
            </div>
        </aside>
    )
}