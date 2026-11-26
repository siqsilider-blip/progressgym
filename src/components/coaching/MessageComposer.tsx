'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Send } from 'lucide-react'
import { sendCoachingMessage, type CoachingTopic } from '@/app/coaching/actions'

const TOPICS: { value: CoachingTopic; label: string }[] = [
    { value: 'general', label: 'Mensaje general' },
    { value: 'question', label: 'Tengo una duda' },
    { value: 'technique', label: 'Técnica' },
    { value: 'pain', label: 'Siento una molestia' },
    { value: 'equipment', label: 'No tengo el equipo' },
    { value: 'alternative', label: 'Necesito una alternativa' },
]

export default function MessageComposer({
    studentId,
    routineDayExerciseId,
    workoutSessionId,
    defaultTopic = 'general',
    placeholder = 'Escribí tu mensaje…',
    compact = false,
    thread = false,
    showTopic = true,
    successMessage = 'Mensaje enviado ✓',
    successHref,
    successLinkLabel = 'Ver conversación',
}: {
    studentId?: string
    routineDayExerciseId?: string | null
    workoutSessionId?: string | null
    defaultTopic?: CoachingTopic
    placeholder?: string
    compact?: boolean
    thread?: boolean
    showTopic?: boolean
    successMessage?: string
    successHref?: string
    successLinkLabel?: string
}) {
    const [topic, setTopic] = useState<CoachingTopic>(defaultTopic)
    const [body, setBody] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)
    const [pending, startTransition] = useTransition()

    function submit() {
        if (!body.trim() || pending) return
        setError(null)
        setSent(false)
        startTransition(async () => {
            const result = await sendCoachingMessage({
                studentId,
                body,
                topic,
                routineDayExerciseId,
                workoutSessionId,
            })
            if (!result.ok) {
                setError(result.error)
                return
            }
            setBody('')
            setSent(true)
        })
    }

    const messageInput = (
        <textarea
            value={body}
            onChange={(event) => { setBody(event.target.value); setError(null); setSent(false) }}
            placeholder={placeholder}
            aria-label={placeholder}
            maxLength={4000}
            rows={compact || thread ? 2 : 3}
            className={`w-full min-w-0 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary ${thread ? 'text-base leading-5' : 'text-sm'}`}
        />
    )
    const sendButton = (
        <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-45 ${thread ? 'self-end' : 'w-full sm:w-auto'}`}
        >
            <Send className="size-3.5" aria-hidden="true" />
            {pending ? 'Enviando…' : 'Enviar'}
        </button>
    )
    const response = <>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {sent && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-emerald-600 dark:text-emerald-400" role="status">
                <p className="font-semibold">{successMessage}</p>
                {successHref && (
                    <Link href={successHref} className="font-bold underline underline-offset-2">
                        {successLinkLabel} →
                    </Link>
                )}
            </div>
        )}
    </>

    return (
        <div className={compact || thread ? 'space-y-2' : 'space-y-3'}>
            {showTopic && (
                <select
                    aria-label="Tipo de mensaje"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value as CoachingTopic)}
                    className={thread
                        ? 'min-h-11 max-w-full rounded-lg bg-background px-2.5 text-base font-medium text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring sm:text-sm'
                        : 'h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary'}
                >
                    {TOPICS.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                </select>
            )}
            {thread ? (
                <>
                    <div className="flex items-end gap-2">{messageInput}{sendButton}</div>
                    {(sent || error) && <div className="text-xs">{response}</div>}
                </>
            ) : (
                <>
                    {messageInput}
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 text-[11px]">{response}</div>
                        {sendButton}
                    </div>
                </>
            )}
        </div>
    )
}
