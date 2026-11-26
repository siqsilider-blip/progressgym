'use client'

import Link from 'next/link'
import { createContext, useContext } from 'react'
import { ChevronRight } from 'lucide-react'

export const StudentUnreadMessagesContext = createContext(0)

export default function StudentHomeUnreadMessages() {
    const unreadMessages = useContext(StudentUnreadMessagesContext)
    if (unreadMessages === 0) return null

    const label = unreadMessages === 1
        ? '1 mensaje de tu entrenador'
        : `${unreadMessages} mensajes de tu entrenador`

    return (
        <Link
            href="/app/messages"
            prefetch={false}
            aria-label={`Leer ${label}`}
            className="inline-flex min-h-11 w-fit max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <span className="min-w-0 break-words">{label}</span>
            <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
    )
}
