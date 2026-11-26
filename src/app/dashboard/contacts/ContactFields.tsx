import { useId } from 'react'

type ContactFieldValues = {
    full_name: string | null
    phone: string | null
    objective: string | null
    status: string | null
    temperature: string | null
    next_follow_up_at: string | null
    notes: string | null
}

const fieldClass =
    'w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground lg:rounded-lg'
const controlClass = `h-11 ${fieldClass}`
const labelClass = 'block text-sm font-medium text-foreground'

export default function ContactFields({ contact }: { contact?: ContactFieldValues }) {
    const id = useId()

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
                <label htmlFor={`${id}-name`} className={labelClass}>Nombre completo</label>
                <input id={`${id}-name`} name="full_name" autoComplete="off" required defaultValue={contact?.full_name ?? ''} className={controlClass} placeholder="Ej. Juan Pérez" />
            </div>

            <div className="space-y-1.5">
                <label htmlFor={`${id}-phone`} className={labelClass}>Teléfono</label>
                <input id={`${id}-phone`} name="phone" type="tel" autoComplete="off" defaultValue={contact?.phone ?? ''} className={controlClass} placeholder="Ej. 11 2345 6789" />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor={`${id}-objective`} className={labelClass}>Objetivo</label>
                <input id={`${id}-objective`} name="objective" defaultValue={contact?.objective ?? ''} className={controlClass} placeholder="Ej. Ganar fuerza" />
            </div>

            <div className="space-y-1.5">
                <label htmlFor={`${id}-status`} className={labelClass}>Estado</label>
                <select id={`${id}-status`} name="status" defaultValue={contact?.status ?? 'new'} className={controlClass}>
                    <option value="new">Nuevo</option>
                    <option value="contacted">Contactado</option>
                    <option value="interested">Interesado</option>
                    <option value="negotiation">Negociación</option>
                    <option value="inactive">Inactivo</option>
                    <option value="lost">Perdido</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label htmlFor={`${id}-temperature`} className={labelClass}>Nivel de interés</label>
                <select id={`${id}-temperature`} name="temperature" defaultValue={contact?.temperature ?? 'warm'} className={controlClass}>
                    <option value="cold">Interés bajo</option>
                    <option value="warm">Interés medio</option>
                    <option value="hot">Interés alto</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label htmlFor={`${id}-follow-up`} className={labelClass}>Próximo seguimiento</label>
                <input id={`${id}-follow-up`} name="next_follow_up_at" type="date" defaultValue={contact?.next_follow_up_at?.slice(0, 10) ?? ''} className={controlClass} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor={`${id}-notes`} className={labelClass}>Notas</label>
                <textarea id={`${id}-notes`} name="notes" rows={3} defaultValue={contact?.notes ?? ''} className={`min-h-24 py-2.5 ${fieldClass}`} placeholder="Ej. Consultó por entrenamiento online en Instagram" />
            </div>
        </div>
    )
}
