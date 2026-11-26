'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProgramStartDate } from './actions'
import { studentSection, studentSectionTitle } from './profileStyles'

type Props = {
    studentId: string
    routineName: string
    programStartedOn: string
    currentWeekName: string | null
    programWeekNumber: number
    totalProgramWeeks: number
}

export default function ProgramScheduleCard({
    studentId,
    routineName,
    programStartedOn,
    currentWeekName,
    programWeekNumber,
    totalProgramWeeks,
}: Props) {
    const router = useRouter()
    const [date, setDate] = useState(programStartedOn)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [isPending, startTransition] = useTransition()
    const weekLabel = totalProgramWeeks > 1
        ? [currentWeekName, `Semana ${programWeekNumber} de ${totalProgramWeeks}`].filter(Boolean).join(' · ')
        : currentWeekName || (totalProgramWeeks === 1 ? 'Semana 1' : 'Semana actual')

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setSaved(false)

        const formData = new FormData(event.currentTarget)
        startTransition(async () => {
            const result = await updateProgramStartDate(formData)
            if (!result.ok) {
                setError(result.error ?? 'No se pudo guardar el cambio.')
                return
            }

            setSaved(true)
            router.refresh()
        })
    }

    return (
        <section className={`rounded-xl border border-border bg-card p-3 ${studentSection}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-soft">
                        Programa activo
                    </p>
                    <h2 className={`mt-1 break-words text-base font-bold text-foreground ${studentSectionTitle}`}>{routineName}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {weekLabel}
                    </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 lg:bg-transparent lg:px-0 lg:text-xs">
                    Automático
                </span>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 border-t border-border pt-4">
                <input type="hidden" name="studentId" value={studentId} />
                <label htmlFor="programStartedOn" className="text-xs font-semibold text-card-foreground">
                    Fecha de inicio
                </label>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    La semana cambia automáticamente cada 7 días desde esta fecha.
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                        id="programStartedOn"
                        name="programStartedOn"
                        type="date"
                        required
                        value={date}
                        disabled={isPending}
                        onChange={(event) => {
                            setDate(event.target.value)
                            setSaved(false)
                        }}
                        className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <button
                        type="submit"
                        disabled={isPending || !date || date === programStartedOn}
                        className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending ? 'Guardando…' : 'Actualizar inicio'}
                    </button>
                </div>
                {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
                {saved && <p className="mt-2 text-xs font-medium text-emerald-500">Fecha actualizada ✓</p>}
            </form>
        </section>
    )
}
