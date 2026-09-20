'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Trash2, X } from 'lucide-react'
import { requestOwnAccountDeletion } from '@/app/account/actions'

export default function AccountDeletionCard({ compact = false }: { compact?: boolean }) {
    const [expanded, setExpanded] = useState(false)
    const [confirmation, setConfirmation] = useState('')
    const [error, setError] = useState('')
    const [isPending, startTransition] = useTransition()
    const isConfirmed = confirmation.trim().toUpperCase() === 'ELIMINAR'

    function submitDeletion() {
        if (!isConfirmed || isPending) return
        setError('')
        startTransition(async () => {
            const result = await requestOwnAccountDeletion(confirmation)
            if (!result.ok) {
                setError(result.error)
                return
            }
            window.location.assign('/account-deletion?requested=1')
        })
    }

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3 text-left text-sm text-red-500 transition hover:bg-red-500/10"
            >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span className="font-medium">Eliminar cuenta</span>
            </button>
        )
    }

    return (
        <div className={`rounded-xl border border-red-500/25 bg-red-500/[0.05] ${compact ? 'p-3.5' : 'p-4'}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-red-500">Solicitar eliminación</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Se cerrará tu sesión y eliminaremos la cuenta y sus datos dentro de 7 días. Podés contactar a soporte durante ese plazo.
                    </p>
                </div>
                <button type="button" onClick={() => { setExpanded(false); setError(''); setConfirmation('') }} className="rounded-lg p-1 text-muted-foreground hover:bg-white/5" aria-label="Cancelar eliminación">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <label className="mt-3 block text-xs font-medium text-foreground" htmlFor="delete-account-confirmation">
                Escribí <strong>ELIMINAR</strong> para confirmar
            </label>
            <input
                id="delete-account-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={isPending}
                autoComplete="off"
                className="mt-2 h-10 w-full rounded-xl border border-red-500/25 bg-background px-3 text-sm text-foreground outline-none focus:border-red-500/60"
            />
            {error && <p className="mt-2 text-xs leading-5 text-red-500" role="alert">{error}</p>}

            <div className="mt-3 flex items-center justify-between gap-3">
                <Link href="/account-deletion" className="text-xs text-muted-foreground underline underline-offset-2">Más información</Link>
                <button
                    type="button"
                    onClick={submitDeletion}
                    disabled={!isConfirmed || isPending}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isPending ? 'Registrando…' : 'Solicitar eliminación'}
                </button>
            </div>
        </div>
    )
}
