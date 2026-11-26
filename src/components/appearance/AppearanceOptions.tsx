'use client'

import { useId, useState } from 'react'
import { Check } from 'lucide-react'
import { APPEARANCES, type Appearance } from '@/lib/appearance'
import { saveAppearance } from '@/app/appearance/actions'

const options = ['brand', 'light', 'neutral-dark'] as const

export default function AppearanceOptions({ appearance }: { appearance: Appearance }) {
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
        <div className="rounded-2xl border border-border bg-card p-4">
            <fieldset disabled={pending !== null} aria-busy={pending !== null}>
                <legend className="text-sm font-bold text-card-foreground">Apariencia</legend>
                <div className="mt-3 grid grid-cols-3 gap-2">
                    {options.map((value) => {
                        const option = APPEARANCES[value]
                        const selected = value === current
                        return (
                            <label key={value} className="min-w-0 cursor-pointer">
                                <input
                                    className="peer sr-only"
                                    type="radio"
                                    name={name}
                                    value={value}
                                    checked={selected}
                                    onChange={() => void changeAppearance(value)}
                                />
                                <span className="flex h-full min-h-24 flex-col gap-1.5 rounded-xl border border-border px-2 py-2 text-xs font-semibold text-card-foreground hover:bg-muted/50 peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                                    <span aria-hidden="true" className="relative block h-9 rounded-md border border-border" style={{ backgroundColor: option.background }}>
                                        <span className="absolute inset-x-1.5 bottom-1.5 h-2.5 rounded-sm" style={{ backgroundColor: option.surface }} />
                                        <span className="absolute left-1.5 top-1.5 h-2 w-4 rounded-full" style={{ backgroundColor: option.accent }} />
                                        {selected && <Check className="absolute right-1 top-1 h-4 w-4 rounded-full bg-card p-0.5 text-primary" />}
                                    </span>
                                    <span className="break-words">{option.label}</span>
                                    {value === 'brand' && <span className="text-[10px] font-medium text-muted-foreground">Por defecto</span>}
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
