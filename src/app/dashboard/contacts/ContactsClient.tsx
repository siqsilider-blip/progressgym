'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateContactNoRedirect, deleteContact } from './actions'

export type Contact = {
    id: string
    full_name: string | null
    phone: string | null
    objective: string | null
    status: string | null
    temperature: string | null
    next_follow_up_at: string | null
    last_contact_at: string | null
    notes: string | null
    converted_to_student: boolean | null
}

type Stats = {
    total: number
    pendingToday: number
    overdue: number
    hot: number
    converted: number
} | null

function parseDateOnly(value: string) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
}

function startOfToday() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function formatDateLabel(value: string | null) {
    if (!value) return '—'
    const safe = String(value).slice(0, 10)
    const [year, month, day] = safe.split('-')
    if (!year || !month || !day) return '—'
    return `${day}/${month}/${year}`
}

function buildWhatsAppUrl(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    const withCode = digits.startsWith('54') ? digits : `54${digits.replace(/^0+/, '')}`
    return `https://wa.me/${withCode}`
}

const STATUS_LABELS: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    interested: 'Interesado',
    negotiation: 'Negociación',
    inactive: 'Inactivo',
    lost: 'Perdido',
    converted: 'Convertido',
}

const STATUS_STYLES: Record<string, string> = {
    new: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    contacted: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    interested: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
    negotiation: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    inactive: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
    lost: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    converted: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
}

const TEMP_LABELS: Record<string, string> = {
    cold: 'Interés bajo',
    warm: 'Interés medio',
    hot: 'Interés alto',
}

const TEMP_STYLES: Record<string, string> = {
    cold: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    warm: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    hot: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-500',
}

const INPUT_CLS =
    'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground'
const SELECT_CLS =
    'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

function EditModal({ contact, onClose }: { contact: Contact; onClose: () => void }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault()
        if (isPending) return
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const result = await updateContactNoRedirect(formData)
            if (!result.ok) {
                setError(result.error || 'No se pudo guardar')
                return
            }
            onClose()
            router.refresh()
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="w-full max-w-lg rounded-t-2xl border border-border bg-background shadow-xl sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <h2 className="text-base font-semibold text-foreground">Editar contacto</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        ✕
                    </button>
                </div>

                <div className="max-h-[75vh] overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4 p-5">
                        <input type="hidden" name="id" value={contact.id} />

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Nombre</label>
                            <input name="full_name" required defaultValue={contact.full_name ?? ''} className={INPUT_CLS} placeholder="Nombre completo" />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Teléfono</label>
                            <input name="phone" defaultValue={contact.phone ?? ''} className={INPUT_CLS} placeholder="Ej: 11 2345 6789" />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Objetivo</label>
                            <input name="objective" defaultValue={contact.objective ?? ''} className={INPUT_CLS} placeholder="Ej: Bajar de peso" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
                                <select name="status" defaultValue={contact.status ?? 'new'} className={SELECT_CLS}>
                                    <option value="new">Nuevo</option>
                                    <option value="contacted">Contactado</option>
                                    <option value="interested">Interesado</option>
                                    <option value="negotiation">Negociación</option>
                                    <option value="inactive">Inactivo</option>
                                    <option value="lost">Perdido</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-foreground">Interés</label>
                                <select name="temperature" defaultValue={contact.temperature ?? 'warm'} className={SELECT_CLS}>
                                    <option value="cold">Bajo</option>
                                    <option value="warm">Medio</option>
                                    <option value="hot">Alto</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Próximo seguimiento</label>
                            <input
                                type="date"
                                name="next_follow_up_at"
                                defaultValue={contact.next_follow_up_at ? String(contact.next_follow_up_at).slice(0, 10) : ''}
                                className={INPUT_CLS}
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Notas</label>
                            <textarea
                                name="notes"
                                rows={3}
                                defaultValue={contact.notes ?? ''}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground"
                                placeholder="Notas sobre el contacto..."
                            />
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-11 flex-1 rounded-xl border border-border text-sm font-medium text-foreground transition hover:bg-muted"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                            >
                                {isPending ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function ContactsClient({
    contacts,
    stats,
}: {
    contacts: Contact[]
    stats: Stats
}) {
    const [editingContact, setEditingContact] = useState<Contact | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
    const today = startOfToday()

    const sorted = [...contacts].sort((a, b) => {
        const aDate = a.next_follow_up_at
            ? parseDateOnly(String(a.next_follow_up_at).slice(0, 10))
            : null
        const bDate = b.next_follow_up_at
            ? parseDateOnly(String(b.next_follow_up_at).slice(0, 10))
            : null
        const aOverdue = !!aDate && aDate < today && !a.converted_to_student
        const bOverdue = !!bDate && bDate < today && !b.converted_to_student
        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1
        if (aDate && bDate) return aDate.getTime() - bDate.getTime()
        if (aDate && !bDate) return -1
        if (!aDate && bDate) return 1
        return 0
    })

    return (
        <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Hoy</p>
                    <p className="mt-1.5 text-2xl font-semibold text-foreground">
                        {stats?.pendingToday ?? 0}
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Atrasados</p>
                    <p className={`mt-1.5 text-2xl font-semibold ${(stats?.overdue ?? 0) > 0 ? 'text-red-500' : 'text-foreground'}`}>
                        {stats?.overdue ?? 0}
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Convertidos</p>
                    <p className="mt-1.5 text-2xl font-semibold text-emerald-500">
                        {stats?.converted ?? 0}
                    </p>
                </div>
            </div>

            {/* Contact list */}
            <div className="space-y-2">
                {sorted.map((c) => {
                    const nextDate = c.next_follow_up_at
                        ? parseDateOnly(String(c.next_follow_up_at).slice(0, 10))
                        : null
                    const isOverdue = !!nextDate && nextDate < today && !c.converted_to_student
                    const waUrl = c.phone ? buildWhatsAppUrl(c.phone) : null
                    const statusStyle = STATUS_STYLES[c.status ?? ''] ?? STATUS_STYLES.new
                    const statusLabel = STATUS_LABELS[c.status ?? ''] ?? 'Nuevo'
                    const tempStyle = TEMP_STYLES[c.temperature ?? ''] ?? TEMP_STYLES.warm
                    const tempLabel = TEMP_LABELS[c.temperature ?? ''] ?? 'Interés medio'

                    return (
                        <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {c.full_name}
                                    </p>
                                    {c.objective && (
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                            {c.objective}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle}`}>
                                        {statusLabel}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tempStyle}`}>
                                        {tempLabel}
                                    </span>
                                    {isOverdue && (
                                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                            Atrasado
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>
                                    Último contacto: {c.last_contact_at ? formatDateLabel(c.last_contact_at) : 'Sin registrar'}
                                </span>
                                <span>·</span>
                                <span className={isOverdue ? 'font-medium text-red-500 dark:text-red-400' : ''}>
                                    Próximo seguimiento: {c.next_follow_up_at ? formatDateLabel(c.next_follow_up_at) : 'No definido'}
                                </span>
                            </div>

                            <div className="mt-3 flex gap-2">
                                {waUrl ? (
                                    <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex h-9 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-xs font-semibold text-white transition hover:bg-emerald-500"
                                    >
                                        Contactar por WhatsApp
                                    </a>
                                ) : (
                                    <button
                                        disabled
                                        className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground"
                                        title="Sin teléfono registrado"
                                    >
                                        Sin teléfono
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setEditingContact(c)}
                                    className="flex h-9 items-center justify-center rounded-lg border border-border bg-secondary px-4 text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                                >
                                    Editar
                                </button>
                                {confirmDeleteId === c.id ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs text-secondary-foreground transition hover:bg-muted"
                                        >
                                            No
                                        </button>
                                        <form action={deleteContact}>
                                            <input type="hidden" name="id" value={c.id} />
                                            <button
                                                type="submit"
                                                className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
                                            >
                                                Sí
                                            </button>
                                        </form>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(c.id)}
                                        className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-500 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                                    >
                                        Eliminar
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}

                {contacts.length === 0 && (
                    <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                        Todavía no hay contactos cargados.
                    </div>
                )}
            </div>

            {editingContact && (
                <EditModal
                    contact={editingContact}
                    onClose={() => setEditingContact(null)}
                />
            )}
        </>
    )
}
