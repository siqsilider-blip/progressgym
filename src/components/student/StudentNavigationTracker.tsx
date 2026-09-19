'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export const STUDENT_HISTORY_KEY = 'progrezzia:student-history'
export const STUDENT_BACK_KEY = 'progrezzia:student-going-back'

function readHistory() {
    try {
        const stored = window.sessionStorage.getItem(STUDENT_HISTORY_KEY)
        const parsed = stored ? JSON.parse(stored) : []
        return Array.isArray(parsed)
            ? parsed.filter((value): value is string => typeof value === 'string')
            : []
    } catch {
        return []
    }
}

export default function StudentNavigationTracker() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const query = searchParams.toString()

    useEffect(() => {
        const route = `${pathname}${query ? `?${query}` : ''}`
        const isBack = window.sessionStorage.getItem(STUDENT_BACK_KEY) === '1'
        const history = readHistory()

        if (isBack) {
            window.sessionStorage.removeItem(STUDENT_BACK_KEY)
            if (history.at(-1) !== route) history.push(route)
        } else if (history.at(-2) === route) {
            history.pop()
        } else if (history.at(-1) !== route) {
            history.push(route)
        }

        window.sessionStorage.setItem(STUDENT_HISTORY_KEY, JSON.stringify(history.slice(-40)))
    }, [pathname, query])

    return null
}
