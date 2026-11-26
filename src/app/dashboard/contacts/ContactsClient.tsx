'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Pencil, Trash2, X } from 'lucide-react'
import ContactFields from './ContactFields'
import { deleteContact, updateContactNoRedirect } from './actions'

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

function formatDateLabel(value: string) {
    const [year, month, day] = value.split('-')
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

const TEMP_LABELS: Record<string, string> = {
    cold: 'Interés bajo',
    warm: 'Interés medio',
    hot: 'Interés alto',
}

const CONTACT_COLUMNS = 'lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.7fr)_minmax(0,1fr)_auto]'
const ROW_ACTION =
    'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-8 lg:px-1.5'

function EditModal({ contact, onClose }: { contact: Contact; onClose: () => void }) {
    const router = useRouter()
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')

    useEffect(() => {
        if (!dialogRef.current?.open) dialogRef.current?.showModal()
    }, [])

    function closeDialog() {
        dialogRef.current?.close()
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (isPending) return
        setError('')
        const formData = new FormData(event.currentTarget)
        startTransition(async () => {
            const result = await updateContactNoRedirect(formData)
            if (!result.ok) {
                setError(result.error || 'No se pudo guardar')
                return
            }
            closeDialog()
            router.refresh()
        })
    }

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            onClick={(event) => { if (event.target === event.currentTarget) closeDialog() }}
            aria-labelledby="edit-contact-title"
            className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[94dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-border bg-popover text-popover-foreground shadow-xl backdrop:bg-black/60 sm:inset-0 sm:m-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:rounded-xl"
        >
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
                <h2 id="edit-contact-title" className="text-base font-semibold text-foreground lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-2xl lg:font-normal">
                    Editar contacto
                </h2>
                <button type="button" onClick={closeDialog} className={`text-muted-foreground hover:text-foreground ${ROW_ACTION}`} aria-label="Cerrar edición">
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <input type="hidden" name="id" value={contact.id} />
                <ContactFields contact={contact} />

                {error && <p role="alert" className="border-l-2 border-destructive px-3 py-2 text-sm text-destructive">{error}</p>}

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                    <button type="button" onClick={closeDialog} className={`border border-border text-foreground ${ROW_ACTION}`}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
                    >
                        {isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </dialog>
    )
}

function ContactDate({ value, fallback }: { value: string | null; fallback: string }) {
    if (!value) return fallback
    const day = value.slice(0, 10)
    return <time dateTime={day}>{formatDateLabel(day)}</time>
}

export default function ContactsClient({ contacts, stats }: { contacts: Contact[]; stats: Stats }) {
    const [editingContact, setEditingContact] = useState<Contact | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const today = startOfToday()

    const sorted = [...contacts].sort((a, b) => {
        const aDate = a.next_follow_up_at ? parseDateOnly(a.next_follow_up_at.slice(0, 10)) : null
        const bDate = b.next_follow_up_at ? parseDateOnly(b.next_follow_up_at.slice(0, 10)) : null
        const aOverdue = !!aDate && aDate < today && !a.converted_to_student
        const bOverdue = !!bDate && bDate < today && !b.converted_to_student
        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1
        if (aDate && bDate) return aDate.getTime() - bDate.getTime()
        if (aDate && !bDate) return -1
        if (!aDate && bDate) return 1
        return 0
    })

    const overdue = stats?.overdue ?? 0
    const metrics = [
        { label: 'Hoy', description: 'Seguimientos programados', value: stats?.pendingToday ?? 0 },
        { label: 'Atrasados', description: 'Seguimientos vencidos', value: overdue },
        { label: 'Convertidos', description: 'Contactos que pasaron a alumnos', value: stats?.converted ?? 0 },
    ]

    return (
        <>
            <dl className="grid grid-cols-3 gap-2 lg:gap-0 lg:border-y lg:border-border">
                {metrics.map((metric) => (
                    <div key={metric.label} className="min-w-0 rounded-xl border border-border bg-card p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-5 lg:py-3.5 lg:first:pl-0 lg:[&:not(:first-child)]:border-l">
                        <dt className="text-xs font-medium text-muted-foreground lg:font-semibold lg:text-foreground">{metric.label}</dt>
                        <dd className={`mt-1 text-xl font-black tabular-nums lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-4xl lg:font-normal ${metric.label === 'Atrasados' && overdue > 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {metric.value}
                        </dd>
                        <dd className="mt-0.5 hidden text-xs text-muted-foreground lg:block">{metric.description}</dd>
                    </div>
                ))}
            </dl>

            <section aria-labelledby="contacts-title">
                <div className="mb-3 flex items-center justify-between gap-3 lg:mb-0 lg:border-b lg:border-border lg:pb-2.5">
                    <h2 id="contacts-title" className="text-base font-semibold text-foreground lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-[1.75rem] lg:leading-tight lg:font-normal lg:tracking-tight">
                        Agenda de contactos
                    </h2>
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {sorted.length} {sorted.length === 1 ? 'contacto' : 'contactos'}
                    </span>
                </div>

                {sorted.length > 0 && (
                    <div className={`hidden items-center gap-4 border-b border-border px-1 py-2 text-xs font-semibold text-muted-foreground lg:grid ${CONTACT_COLUMNS}`} aria-hidden="true">
                        <span>Contacto</span>
                        <span>Estado</span>
                        <span>Próximo seguimiento</span>
                        <span className="w-[13rem] text-right">Acciones</span>
                    </div>
                )}

                <ul className="space-y-2 lg:space-y-0">
                    {sorted.map((contact) => {
                        const nextDate = contact.next_follow_up_at ? parseDateOnly(contact.next_follow_up_at.slice(0, 10)) : null
                        const isOverdue = !!nextDate && nextDate < today && !contact.converted_to_student
                        const waUrl = contact.phone ? buildWhatsAppUrl(contact.phone) : null
                        const name = contact.full_name || 'Sin nombre'
                        const status = STATUS_LABELS[contact.status ?? ''] ?? 'Nuevo'
                        const temperature = TEMP_LABELS[contact.temperature ?? ''] ?? 'Interés medio'
                        const confirmsDeletion = confirmDeleteId === contact.id

                        return (
                            <li key={contact.id} className="space-y-2.5 rounded-xl border border-border bg-card p-3 lg:space-y-0 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:p-0">
                                <div className={`grid gap-x-3 gap-y-2 lg:items-center lg:gap-4 lg:px-1 lg:py-3 ${CONTACT_COLUMNS}`}>
                                    <div className="min-w-0">
                                        <h3 className="break-words text-sm font-semibold text-foreground">{name}</h3>
                                        {contact.objective && (
                                            <p className="mt-0.5 break-words text-xs text-muted-foreground">{contact.objective}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs lg:block lg:space-y-0.5">
                                        <p className="font-medium text-foreground">{status}</p>
                                        <p className="text-muted-foreground">{temperature}</p>
                                    </div>

                                    <div className="space-y-0.5 text-xs">
                                        <p className={isOverdue ? 'font-semibold text-destructive' : 'font-medium text-foreground'}>
                                            <span className="lg:hidden">Próximo seguimiento{' '}</span>
                                            <ContactDate value={contact.next_follow_up_at} fallback="Sin fecha" />
                                            {isOverdue && <span className="ml-1.5 font-normal">· Atrasado</span>}
                                        </p>
                                        <p className="text-muted-foreground">
                                            Último contacto{' '}<ContactDate value={contact.last_contact_at} fallback="sin registrar" />
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1 lg:w-[13rem] lg:flex-nowrap lg:justify-end">
                                        {waUrl ? (
                                            <a
                                                href={waUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`text-brand-soft ${ROW_ACTION}`}
                                                aria-label={`Contactar a ${name} por WhatsApp`}
                                            >
                                                <MessageCircle className="size-4" aria-hidden="true" />
                                                WhatsApp
                                            </a>
                                        ) : (
                                            <span className="px-2.5 text-xs text-muted-foreground">Sin teléfono</span>
                                        )}
                                        <button type="button" onClick={() => setEditingContact(contact)} className={`text-muted-foreground hover:text-foreground ${ROW_ACTION}`} aria-label={`Editar a ${name}`}>
                                            <Pencil className="size-3.5" aria-hidden="true" />
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDeleteId((id) => id === contact.id ? null : contact.id)}
                                            className={`text-muted-foreground hover:text-destructive ${ROW_ACTION}`}
                                            aria-label={`Eliminar a ${name}`}
                                            aria-expanded={confirmsDeletion}
                                            aria-controls={confirmsDeletion ? `delete-contact-${contact.id}` : undefined}
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                {confirmsDeletion && (
                                    <div id={`delete-contact-${contact.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5 lg:pb-3">
                                        <p className="text-xs text-muted-foreground">¿Eliminar el contacto de {name}?</p>
                                        <div className="flex items-center gap-1.5">
                                            <button type="button" onClick={() => setConfirmDeleteId(null)} className={`text-muted-foreground hover:text-foreground ${ROW_ACTION}`}>Cancelar</button>
                                            <form action={deleteContact}>
                                                <input type="hidden" name="id" value={contact.id} />
                                                <button type="submit" className="min-h-8 rounded-md border border-destructive/40 px-2.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                                                    Eliminar contacto
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>

                {sorted.length === 0 && (
                    <p className="rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-0">
                        Todavía no hay contactos cargados.
                    </p>
                )}
            </section>

            {editingContact && <EditModal contact={editingContact} onClose={() => setEditingContact(null)} />}
        </>
    )
}
