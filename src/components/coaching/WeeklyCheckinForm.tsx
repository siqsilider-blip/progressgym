'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, ChevronDown } from 'lucide-react'
import { saveWeeklyCheckin } from '@/app/coaching/actions'

type WeeklyCheckinValue = {
    energy: number
    sleep_quality: number
    stress: number
    training_difficulty: number
    had_pain: boolean
    pain_details: string | null
    body_weight: number | null
    waist_cm: number | null
    comment: string | null
}

export default function WeeklyCheckinForm({
    initialValue,
}: {
    initialValue: WeeklyCheckinValue | null
}) {
    const [energy, setEnergy] = useState(initialValue?.energy ?? 0)
    const [sleepQuality, setSleepQuality] = useState(initialValue?.sleep_quality ?? 0)
    const [stress, setStress] = useState(initialValue?.stress ?? 0)
    const [trainingDifficulty, setTrainingDifficulty] = useState(initialValue?.training_difficulty ?? 0)
    const [hadPain, setHadPain] = useState(initialValue?.had_pain ?? false)
    const [painDetails, setPainDetails] = useState(initialValue?.pain_details ?? '')
    const [bodyWeight, setBodyWeight] = useState(initialValue?.body_weight?.toString() ?? '')
    const [waistCm, setWaistCm] = useState(initialValue?.waist_cm?.toString() ?? '')
    const [comment, setComment] = useState(initialValue?.comment ?? '')
    const [saved, setSaved] = useState(Boolean(initialValue))
    const [error, setError] = useState('')
    const [pending, startTransition] = useTransition()

    function submit() {
        if (pending) return
        setError('')
        setSaved(false)
        startTransition(async () => {
            const result = await saveWeeklyCheckin({
                energy,
                sleepQuality,
                stress,
                trainingDifficulty,
                hadPain,
                painDetails,
                bodyWeight,
                waistCm,
                comment,
            })
            if (!result.ok) {
                setError(result.error ?? 'No pudimos guardar el control.')
                return
            }
            setSaved(true)
        })
    }

    return (
        <div className="space-y-3">
            <ScoreQuestion
                label="¿Cómo estuvo tu energía?"
                value={energy}
                onChange={setEnergy}
                labels={['Muy baja', 'Baja', 'Normal', 'Buena', 'Muy buena']}
            />
            <ScoreQuestion
                label="¿Cómo dormiste esta semana?"
                value={sleepQuality}
                onChange={setSleepQuality}
                labels={['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien']}
            />
            <ScoreQuestion
                label="¿Cuánto estrés tuviste?"
                value={stress}
                onChange={setStress}
                labels={['Nada', 'Poco', 'Normal', 'Alto', 'Muy alto']}
            />
            <ScoreQuestion
                label="¿Qué tan exigentes fueron los entrenamientos?"
                value={trainingDifficulty}
                onChange={setTrainingDifficulty}
                labels={['Muy fáciles', 'Fáciles', 'Justos', 'Difíciles', 'Demasiado']}
            />

            <section className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-bold text-foreground">¿Tuviste dolor o alguna molestia?</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setHadPain(false)} className={`min-h-11 rounded-xl border text-sm font-bold ${!hadPain ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500' : 'border-border bg-background text-muted-foreground'}`}>No</button>
                    <button type="button" onClick={() => setHadPain(true)} className={`min-h-11 rounded-xl border text-sm font-bold ${hadPain ? 'border-amber-500/40 bg-amber-500/10 text-amber-500' : 'border-border bg-background text-muted-foreground'}`}>Sí</button>
                </div>
                {hadPain && (
                    <textarea
                        value={painDetails}
                        onChange={(event) => setPainDetails(event.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="¿Dónde la sentiste y cuándo aparece?"
                        className="mt-3 w-full resize-none rounded-xl border border-amber-500/30 bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-amber-500"
                    />
                )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
                <label className="text-sm font-bold text-foreground" htmlFor="weekly-comment">¿Querés contarle algo más a tu entrenador?</label>
                <textarea
                    id="weekly-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Opcional"
                    className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-indigo-500"
                />
            </section>

            <details className="group rounded-2xl border border-border bg-card p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-foreground [&::-webkit-details-marker]:hidden">
                    Peso y cintura (opcional)
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
                </summary>
                <p className="mt-1 text-[11px] text-muted-foreground">Solo completalos si querés llevar un seguimiento.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <MeasureInput label="Peso" suffix="kg" value={bodyWeight} onChange={setBodyWeight} />
                    <MeasureInput label="Cintura" suffix="cm" value={waistCm} onChange={setWaistCm} />
                </div>
            </details>

            {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">{error}</p>}
            {saved && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-500">
                    <Check className="h-4 w-4" />
                    Control enviado a tu entrenador.
                </div>
            )}

            <button type="button" onClick={submit} disabled={pending} className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 text-sm font-black text-white transition active:scale-[0.99] disabled:opacity-50">
                {pending ? 'Guardando…' : initialValue ? 'Actualizar control' : 'Enviar control semanal'}
            </button>
            <Link href="/app" className="block py-2 text-center text-xs font-semibold text-muted-foreground">Volver al inicio</Link>
        </div>
    )
}

function ScoreQuestion({
    label,
    value,
    onChange,
    labels,
}: {
    label: string
    value: number
    onChange: (value: number) => void
    labels: string[]
}) {
    return (
        <section className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold text-foreground">{label}</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
                {labels.map((text, index) => {
                    const score = index + 1
                    return (
                        <button key={text} type="button" onClick={() => onChange(score)} aria-label={text} className={`min-h-11 rounded-xl border text-sm font-black ${value === score ? 'border-indigo-500 bg-indigo-500/15 text-indigo-500' : 'border-border bg-background text-muted-foreground'}`}>
                            {score}
                        </button>
                    )
                })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>{labels[0]}</span>
                <span className="font-medium text-foreground">{value ? labels[value - 1] : 'Elegí una opción'}</span>
                <span>{labels[4]}</span>
            </div>
        </section>
    )
}

function MeasureInput({ label, suffix, value, onChange }: { label: string; suffix: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="rounded-xl border border-border bg-background p-3 text-xs font-semibold text-muted-foreground">
            {label}
            <div className="mt-1 flex items-center gap-1">
                <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder="—" className="min-w-0 flex-1 bg-transparent text-lg font-bold text-foreground outline-none" />
                <span className="text-[11px]">{suffix}</span>
            </div>
        </label>
    )
}
