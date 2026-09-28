'use client'

import { useState, useTransition } from 'react'
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
}: {
    studentId?: string
    routineDayExerciseId?: string | null
    workoutSessionId?: string | null
    defaultTopic?: CoachingTopic
    placeholder?: string
    compact?: boolean
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

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            <select
                value={topic}
                onChange={(event) => setTopic(event.target.value as CoachingTopic)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
            >
                {TOPICS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                ))}
            </select>
            <textarea
                value={body}
                onChange={(event) => { setBody(event.target.value); setError(null); setSent(false) }}
                placeholder={placeholder}
                maxLength={4000}
                rows={compact ? 2 : 3}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
            />
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-[11px]">
                    {error && <p className="text-red-500">{error}</p>}
                    {sent && <p className="text-emerald-500">Mensaje enviado ✓</p>}
                </div>
                <button
                    type="button"
                    onClick={submit}
                    disabled={pending || !body.trim()}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-45"
                >
                    <Send className="h-3.5 w-3.5" />
                    {pending ? 'Enviando…' : 'Enviar'}
                </button>
            </div>
        </div>
    )
}
