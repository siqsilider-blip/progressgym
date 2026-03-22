'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function MobileSidebarShell({
    children,
}: {
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="flex items-center justify-between border-b border-zinc-800 p-4 md:hidden">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <span className="text-sm font-semibold text-white">
                    ProgressGym
                </span>

                <div className="w-10" />
            </div>

            {open && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setOpen(false)}
                    />

                    <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-zinc-800 bg-zinc-950">
                        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
                            <span className="text-sm font-semibold text-white">
                                ProgressGym
                            </span>

                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div onClick={() => setOpen(false)}>
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}