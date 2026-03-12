'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Activity, Settings, LogOut, Dumbbell, UserPlus } from 'lucide-react'
import { logout } from '@/app/auth/actions'

const navItems = [
    { name: 'Students', href: '/dashboard', icon: Users },
    { name: 'Add Student', href: '/dashboard/students/new', icon: UserPlus },
    { name: 'Exercises', href: '/dashboard/exercises', icon: Activity },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 flex flex-col items-stretch pt-6 h-screen sticky top-0 backdrop-blur-md">
            <div className="px-6 mb-8 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-lg shadow-indigo-500/20">
                    <Dumbbell className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg text-white">ProgressGym</span>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
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

            <div className="p-4 mt-auto border-t border-zinc-800/60">
                <form action={logout}>
                    <button
                        type="submit"
                        className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </form>
            </div>
        </aside>
    )
}
