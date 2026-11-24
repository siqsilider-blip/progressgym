'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { reviewTechniqueVideo } from './actions'

export default function ReviewTechniqueVideoForm({
    submissionId,
    studentName,
}: {
    submissionId: string
    studentName: string
}) {
    const router = useRouter()
    const [feedback, setFeedback] = useState('')
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)
    const [pending, startTransition] = useTransition()

    function submit() {
        if (pending) return
        setError('')
        setSaved(false)

        startTransition(async () => {
            const result = await reviewTechniqueVideo({ submissionId, feedback })
            if (!result.ok) {
                setError(result.error ?? 'No pudimos guardar la devolución.')
                return
            }

            setSaved(true)
            setFeedback('')
            router.refresh()
        })
    }

    return (
        <div className="space-y-2.5">
            <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                    Tu devolución
                </span>
                <textarea
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder={`Indicaciones para ${studentName}…`}
                    className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-white/20 focus:border-primary/45"
                />
            </label>

            <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-white/25">{feedback.length}/2000</span>
                <button
                    type="button"
                    onClick={submit}
                    disabled={pending || !feedback.trim()}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {pending ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                        <Send className="h-3.5 w-3.5" />
                    )}
                    Enviar y marcar revisado
                </button>
            </div>

            {error && (
                <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-[11px] text-red-300">
                    {error}
                </p>
            )}
            {saved && (
                <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Devolución enviada.
                </p>
            )}
        </div>
    )
}
