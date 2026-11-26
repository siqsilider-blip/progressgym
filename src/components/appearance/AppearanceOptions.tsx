'use client'

import { useId, useState } from 'react'
import { Check } from 'lucide-react'
import { APPEARANCES, type Appearance } from '@/lib/appearance'
import { saveAppearance } from '@/app/appearance/actions'

const options = ['brand', 'light', 'neutral-dark'] as const

export default function AppearanceOptions({ appearance, notebook = false }: { appearance: Appearance; notebook?: boolean }) {
    const name = useId()
    const [pending, setPending] = useState<Appearance | null>(null)
    const [message, setMessage] = useState('')
    const [hasError, setHasError] = useState(false)
    const current = pending ?? appearance

    async function changeAppearance(value: Appearance) {
        if (pending || value === appearance) return
        setPending(value)
        setHasError(false)
        setMessage('')
        try {
            const result = await saveAppearance(value)
            setHasError(!result.ok)
            setMessage(result.ok ? 'Apariencia guardada.' : result.error)
        } catch {
            setHasError(true)
            setMessage('No pudimos cambiar la apariencia. Volvé a intentar.')
        } finally {
            setPending(null)
        }
    }

    return (
        <div className={notebook ? 'mb-2 pl-7' : 'rounded-2xl border border-border bg-card p-4'}>
            <fieldset disabled={pending !== null} aria-busy={pending !== null}>
                <legend className={notebook ? 'sr-only' : 'text-sm font-bold text-card-foreground'}>Apariencia</legend>
                <div className={notebook ? 'divide-y divide-border' : 'mt-3 grid grid-cols-3 gap-2'}>
                    {options.map((value) => {
                        const option = APPEARANCES[value]
                        const selected = value === current
                        return (
                            <label key={value} className="block min-w-0 cursor-pointer">
                                <input
                                    className="peer sr-only"
                                    type="radio"
                                    name={name}
                                    value={value}
                                    checked={selected}
                                    onChange={() => void changeAppearance(value)}
                                />
                                <span className={notebook
                                    ? 'flex min-h-12 items-center gap-2.5 py-2 text-sm font-semibold text-foreground peer-checked:text-brand-soft peer-focus-visible:outline-2 peer-focus-visible:outline-ring'
                                    : 'flex h-full min-h-24 flex-col gap-1.5 rounded-xl border border-border px-2 py-2 text-xs font-semibold text-card-foreground hover:bg-muted/50 peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring'}>
                                    <span aria-hidden="true" className={`relative block rounded-md border border-border ${notebook ? 'h-7 w-10 shrink-0' : 'h-9'}`} style={{ backgroundColor: option.background }}>
                                        <span className="absolute inset-x-1.5 bottom-1.5 h-2.5 rounded-sm" style={{ backgroundColor: option.surface }} />
                                        <span className="absolute left-1.5 top-1.5 h-2 w-4 rounded-full" style={{ backgroundColor: option.accent }} />
                                        {selected && !notebook && <Check className="absolute right-1 top-1 h-4 w-4 rounded-full bg-card p-0.5 text-primary" />}
                                    </span>
                                    <span className="break-words">{option.label}</span>
                                    {value === 'brand' && <span className="text-[11px] font-medium text-muted-foreground">Por defecto</span>}
                                    {selected && notebook && <Check className="ml-auto size-4 shrink-0" aria-hidden="true" />}
                                </span>
                            </label>
                        )
                    })}
                </div>
            </fieldset>
            <p role="status" className={`mt-2 text-xs ${hasError ? 'text-destructive' : 'text-muted-foreground'} ${message ? '' : 'sr-only'}`}>
                {message}
            </p>
        </div>
    )
}
