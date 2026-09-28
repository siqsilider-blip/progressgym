'use client'

import { useEffect } from 'react'
import { markNotificationTypeRead } from '@/app/coaching/actions'

export default function NotificationTypeReadMarker({ type }: { type: string }) {
    useEffect(() => {
        void markNotificationTypeRead(type)
    }, [type])
    return null
}
