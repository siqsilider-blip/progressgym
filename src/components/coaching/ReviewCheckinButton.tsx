'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { markWeeklyCheckinReviewed } from '@/app/coaching/actions'

export default function ReviewCheckinButton({ checkinId }: { checkinId: string }) {
    const router = useRouter()
    const [error, setError] = useState('')
    const [pending, startTransition] = useTransition()

    function review() {
        if (pending) return
        setError('')
        startTransition(async () => {
            const result = await markWeeklyCheckinReviewed(checkinId)
            if (!result.ok) {
                setError(result.error ?? 'No se pudo guardar.')
                return
            }
            router.refresh()
        })
    }

    return (
        <div>
            <button type="button" onClick={review} disabled={pending} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 text-[10px] font-bold text-emerald-400 disabled:opacity-50">
                <Check className="h-3 w-3" />
                {pending ? 'Guardando…' : 'Marcar revisado'}
            </button>
            {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
        </div>
    )
}
