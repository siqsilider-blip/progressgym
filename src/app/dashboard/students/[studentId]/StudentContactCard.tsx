'use client'

import { useState, useTransition } from 'react'
import { MessageCircle, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { updateStudentContact } from './actions'

export default function StudentContactCard({
    studentId,
    phone,
}: {
    studentId: string
    phone: string | null
}) {
    const router = useRouter()
    const [editing, setEditing] = useState(!phone)
    const [error, setError] = useState('')
    const [isPending, startTransition] = useTransition()
    const whatsappUrl = phone ? buildWhatsAppUrl(phone) : null

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (isPending) return
        setError('')
        const formData = new FormData(event.currentTarget)

        startTransition(async () => {
            const result = await updateStudentContact(formData)
            if (!result.ok) {
                setError(result.error ?? 'No se pudo guardar.')
                return
            }
            setEditing(false)
            router.refresh()
        })
    }

    return (
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                        Contacto
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-foreground">WhatsApp del alumno</h2>
                    {!editing && (
                        <p className="mt-1 text-sm text-muted-foreground">{phone}</p>
                    )}
                </div>

                {!editing && (
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                    </button>
                )}
            </div>

            {editing ? (
                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                    <input type="hidden" name="studentId" value={studentId} />
                    <input
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        defaultValue={phone ?? ''}
                        placeholder="Ej: +54 9 11 2345-6789"
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="flex justify-end gap-2">
                        {phone && (
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => { setEditing(false); setError('') }}
                                className="h-9 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="h-9 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
                        >
                            {isPending ? 'Guardando...' : 'Guardar teléfono'}
                        </button>
                    </div>
                </form>
            ) : whatsappUrl ? (
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                    <MessageCircle className="h-4 w-4" />
                    Abrir WhatsApp
                </a>
            ) : null}
        </section>
    )
}
