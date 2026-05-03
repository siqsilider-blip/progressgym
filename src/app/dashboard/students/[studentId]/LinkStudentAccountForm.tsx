'use client'

import * as React from 'react'
import { linkStudentToUser } from './link-actions'

type Props = {
    studentId: string
    isLinked: boolean
    linkedEmail?: string | null
}

export default function LinkStudentAccountForm({ studentId, isLinked, linkedEmail }: Props) {
    const [email, setEmail] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [message, setMessage] = React.useState<{ text: string; ok: boolean } | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!email.trim()) return
        setLoading(true)
        setMessage(null)

        const result = await linkStudentToUser({ studentId, email: email.trim() })
        setMessage({ text: result.message, ok: result.ok })
        if (result.ok) setEmail('')
        setLoading(false)
    }

    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-card-foreground">
                        Cuenta del alumno
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {isLinked
                            ? `Vinculada a ${linkedEmail}`
                            : 'Sin cuenta vinculada — el alumno no puede loguearse'}
                    </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    isLinked
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-zinc-500/10 text-zinc-400'
                }`}>
                    {isLinked ? '✓ Vinculada' : 'Sin cuenta'}
                </span>
            </div>

            {!isLinked && (
                <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="email@alumno.com"
                        className="flex-1 rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                        {loading ? '...' : 'Vincular'}
                    </button>
                </form>
            )}

            {message && (
                <p className={`mt-2 text-xs font-medium ${
                    message.ok ? 'text-emerald-500' : 'text-red-400'
                }`}>
                    {message.text}
                </p>
            )}
        </div>
    )
}
