'use client'

import { useEffect } from 'react'
import { markCoachingMessagesRead } from '@/app/coaching/actions'

export default function ReadMarker({ conversationId }: { conversationId: string }) {
    useEffect(() => {
        void markCoachingMessagesRead(conversationId)
    }, [conversationId])
    return null
}
