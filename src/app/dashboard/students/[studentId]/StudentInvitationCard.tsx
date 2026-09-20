'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, Copy, ExternalLink, MessageCircle, Send } from 'lucide-react'
import { createStudentAccessInvitation } from './invite-actions'

type PreparedInvitation = {
    inviteUrl: string
    whatsappUrl: string | null
    message: string
    email: string
}

export default function StudentInvitationCard({
    studentId,
    defaultEmail,
    linkedEmail,
    hasRoutine,
    programReady,
    highlight = false,
}: {
    studentId: string
    defaultEmail: string | null
    linkedEmail: string | null
    hasRoutine: boolean
    programReady: boolean
    highlight?: boolean
}) {
    const sectionRef = useRef<HTMLElement>(null)
    const [email, setEmail] = useState(linkedEmail ?? defaultEmail ?? '')
    const [prepared, setPrepared] = useState<PreparedInvitation | null>(null)
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        if (!highlight) return
        const timeout = window.setTimeout(() => {
            sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 200)
        return () => window.clearTimeout(timeout)
    }, [highlight])

    function prepareInvitation(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (isPending) return
        setError('')
        setPrepared(null)
        setCopied(false)

        startTransition(async () => {
            const result = await createStudentAccessInvitation({ studentId, email })
            if (!result.ok) {
                setError(result.error)
                return
            }
            setPrepared(result)
            setEmail(result.email)
        })
    }

    async function copyMessage() {
        if (!prepared) return
        await navigator.clipboard.writeText(prepared.message)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2500)
    }

    return (
        <section
            ref={sectionRef}
            className={`rounded-xl border bg-emerald-500/[0.055] p-3.5 ${highlight ? 'border-emerald-400/50 ring-2 ring-emerald-500/15' : 'border-emerald-500/20'}`}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Send className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">Acceso del alumno</p>
                        {highlight && !linkedEmail && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                                Último paso
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {linkedEmail
                            ? `Cuenta vinculada a ${linkedEmail}. Podés reenviarle un acceso si lo necesita.`
                            : 'Prepará un enlace para que cree su contraseña y entre directamente a su rutina.'}
                    </p>
                </div>
            </div>

            <form onSubmit={prepareInvitation} className="mt-3 space-y-2.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Email del alumno
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={Boolean(linkedEmail) || isPending}
                    required
                    placeholder="alumno@email.com"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-emerald-500 disabled:opacity-70"
                />

                {!hasRoutine && (
                    <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                        Primero asignale una rutina. Así, cuando ingrese, encontrará todo listo.
                    </p>
                )}

                {hasRoutine && !programReady && (
                    <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                        Agregá al menos un ejercicio a la rutina antes de enviar el acceso.
                    </p>
                )}

                {error && <p className="text-xs font-medium text-red-400">{error}</p>}

                <button
                    type="submit"
                    disabled={isPending || !programReady || !email.trim()}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <Send className="h-4 w-4" />
                    {isPending
                        ? 'Preparando...'
                        : linkedEmail
                            ? 'Preparar nuevo acceso'
                            : 'Preparar invitación'}
                </button>
            </form>

            {prepared && (
                <div className="mt-3 space-y-2 rounded-xl border border-emerald-500/20 bg-background/70 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <Check className="h-4 w-4" />
                        Invitación lista
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        El enlace es personal y de un solo uso. Si vence, prepará uno nuevo desde acá.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {prepared.whatsappUrl && (
                            <a
                                href={prepared.whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 text-xs font-bold text-white"
                            >
                                <MessageCircle className="h-4 w-4" />
                                Enviar por WhatsApp
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={copyMessage}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs font-semibold text-secondary-foreground"
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Mensaje copiado' : 'Copiar mensaje'}
                        </button>
                    </div>
                    <a
                        href={prepared.inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline underline-offset-4"
                    >
                        Probar enlace de acceso
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            )}
        </section>
    )
}
