'use client'

import { useState, useTransition } from 'react'
import { saveWorkoutFeedback } from '@/app/coaching/actions'

const SCORE_VALUES = [1, 2, 3, 4, 5]

export default function WorkoutFeedbackForm({
    sessionId,
    studentId,
}: {
    sessionId: string
    studentId: string
}) {
    const [energy, setEnergy] = useState<number | null>(null)
    const [difficulty, setDifficulty] = useState<number | null>(null)
    const [hadPain, setHadPain] = useState(false)
    const [painDetails, setPainDetails] = useState('')
    const [comment, setComment] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [pending, startTransition] = useTransition()

    function save() {
        if (pending) return
        setError(null)
        setSaved(false)
        startTransition(async () => {
            const result = await saveWorkoutFeedback({
                sessionId,
                studentId,
                energy,
                difficulty,
                hadPain,
                painDetails,
                comment,
            })
            if (!result.ok) {
                setError(result.error)
                return
            }
            setSaved(true)
        })
    }

    return (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 text-left">
            <div>
                <h2 className="text-sm font-bold text-foreground">¿Cómo te sentiste?</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Son tres datos rápidos para que tu entrenador pueda acompañarte mejor.</p>
            </div>

            <ScoreSelector label="Energía" value={energy} onChange={setEnergy} lowLabel="Baja" highLabel="Alta" />
            <ScoreSelector label="Dificultad" value={difficulty} onChange={setDifficulty} lowLabel="Fácil" highLabel="Muy difícil" />

            <div className="mt-4">
                <p className="text-xs font-semibold text-foreground">¿Sentiste dolor o una molestia?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setHadPain(false)} className={`min-h-10 rounded-xl border text-xs font-bold ${!hadPain ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500' : 'border-border bg-background text-muted-foreground'}`}>No</button>
                    <button type="button" onClick={() => setHadPain(true)} className={`min-h-10 rounded-xl border text-xs font-bold ${hadPain ? 'border-amber-500/40 bg-amber-500/10 text-amber-500' : 'border-border bg-background text-muted-foreground'}`}>Sí</button>
                </div>
            </div>

            {hadPain && (
                <textarea
                    value={painDetails}
                    onChange={(event) => setPainDetails(event.target.value)}
                    placeholder="¿Dónde la sentiste y en qué ejercicio?"
                    rows={2}
                    className="mt-2 w-full resize-none rounded-xl border border-amber-500/25 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-amber-500"
                />
            )}

            <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Comentario opcional para tu entrenador"
                rows={2}
                className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-indigo-500"
            />

            {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
            {saved && <p className="mt-2 text-xs font-medium text-emerald-500">Evaluación enviada ✓</p>}

            <button type="button" onClick={save} disabled={pending} className="mt-3 min-h-11 w-full rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                {pending ? 'Guardando…' : saved ? 'Actualizar evaluación' : 'Enviar evaluación'}
            </button>
        </section>
    )
}

function ScoreSelector({
    label,
    value,
    onChange,
    lowLabel,
    highLabel,
}: {
    label: string
    value: number | null
    onChange: (value: number) => void
    lowLabel: string
    highLabel: string
}) {
    return (
        <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{label}</span>
                <span className="text-muted-foreground">{value ? `${value}/5` : 'Sin indicar'}</span>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
                {SCORE_VALUES.map((score) => (
                    <button key={score} type="button" onClick={() => onChange(score)} className={`min-h-10 rounded-xl border text-sm font-bold ${value === score ? 'border-indigo-500 bg-indigo-500/15 text-indigo-400' : 'border-border bg-background text-muted-foreground'}`}>
                        {score}
                    </button>
                ))}
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground"><span>{lowLabel}</span><span>{highLabel}</span></div>
        </div>
    )
}
