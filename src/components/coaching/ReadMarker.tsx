'use client'

import { useEffect } from 'react'
import { markCoachingMessagesRead } from '@/app/coaching/actions'
import { COACHING_MESSAGES_READ_EVENT } from '@/lib/coaching/unreadTrainerMessages'

export default function ReadMarker({ conversationId, latestMessageId }: {
    conversationId: string
    latestMessageId?: string | null
}) {
    useEffect(() => {
        if (latestMessageId === null) return

        let isReading = false
        let markedRead = false
        let active = true

        async function markVisibleConversation() {
            if (document.visibilityState !== 'visible' || isReading || markedRead) return

            isReading = true
            try {
                const markedCount = await markCoachingMessagesRead(conversationId)
                markedRead = markedCount !== null
                if (active && markedCount && latestMessageId) {
                    window.dispatchEvent(new Event(COACHING_MESSAGES_READ_EVENT))
                }
            } catch {
                // Leave the messages unread when the request cannot be completed.
            } finally {
                isReading = false
            }
        }

        void markVisibleConversation()
        document.addEventListener('visibilitychange', markVisibleConversation)
        window.addEventListener('online', markVisibleConversation)
        return () => {
            active = false
            document.removeEventListener('visibilitychange', markVisibleConversation)
            window.removeEventListener('online', markVisibleConversation)
        }
    }, [conversationId, latestMessageId])
    return null
}
