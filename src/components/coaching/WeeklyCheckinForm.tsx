'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Camera, Check, ChevronDown } from 'lucide-react'
import { registerProgressPhoto, saveWeeklyCheckin } from '@/app/coaching/actions'
import { supabase } from '@/lib/supabase/client'

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
    studentUserId,
    trainerName,
}: {
    initialValue: WeeklyCheckinValue | null
    studentUserId: string
    trainerName: string
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
    const [photo, setPhoto] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState('')
    const [photoPose, setPhotoPose] = useState<'front' | 'side' | 'back'>('front')
    const [marketingConsent, setMarketingConsent] = useState(false)
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
            if (!result.ok || !result.checkinId) {
                setError(result.error ?? 'No pudimos guardar el control.')
                return
            }

            if (photo) {
                try {
                    const compressed = await compressProgressPhoto(photo)
                    const storagePath = `${studentUserId}/${crypto.randomUUID()}.jpg`
                    const { error: uploadError } = await supabase.storage
                        .from('progress-photos')
                        .upload(storagePath, compressed, {
                            contentType: 'image/jpeg',
                            cacheControl: '3600',
                            upsert: false,
                        })
                    if (uploadError) throw new Error('No pudimos subir la foto.')

                    const registration = await registerProgressPhoto({
                        checkinId: result.checkinId,
                        storagePath,
                        pose: photoPose,
                        marketingConsent,
                    })
                    if (!registration.ok) {
                        await supabase.storage.from('progress-photos').remove([storagePath])
                        throw new Error(registration.error ?? 'No pudimos guardar la foto.')
                    }

                    setPhoto(null)
                    setPhotoPreview('')
                    setMarketingConsent(false)
                } catch (photoError) {
                    setError(photoError instanceof Error ? photoError.message : 'No pudimos procesar la foto.')
                    return
                }
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

            <section className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-foreground">Foto de progreso (opcional)</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Queda privada entre vos y tu entrenador. No hace falta subirla todas las semanas: lo ideal es cada 4 semanas, con luz, distancia y postura parecidas.</p>
                    </div>
                    <Camera className="h-5 w-5 shrink-0 text-indigo-500" />
                </div>

                {photoPreview ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-black">
                        <div className="relative aspect-[3/4] max-h-80 w-full">
                            <Image src={photoPreview} alt="Vista previa de la foto de progreso" fill unoptimized className="object-contain" />
                        </div>
                        <button type="button" onClick={() => { setPhoto(null); setPhotoPreview('') }} className="w-full border-t border-white/10 py-2 text-xs font-semibold text-white/70">Elegir otra foto</button>
                    </div>
                ) : (
                    <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-500/35 bg-indigo-500/[0.06] text-xs font-bold text-indigo-500">
                        <Camera className="h-4 w-4" />
                        Elegir de la galería o sacar una foto
                        <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) => {
                                const selected = event.target.files?.[0] ?? null
                                if (!selected) return
                                if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(selected.type)) {
                                    setError('Elegí una imagen JPG, PNG, WebP o HEIC.')
                                    return
                                }
                                if (selected.size > 20 * 1024 * 1024) {
                                    setError('La imagen original no puede superar 20 MB.')
                                    return
                                }
                                setError('')
                                setPhoto(selected)
                                setPhotoPreview(URL.createObjectURL(selected))
                            }}
                        />
                    </label>
                )}

                {photo && (
                    <div className="mt-3 space-y-3">
                        <div>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Posición</p>
                            <div className="grid grid-cols-3 gap-1.5">
                                {([['front', 'Frente'], ['side', 'Perfil'], ['back', 'Espalda']] as const).map(([value, label]) => (
                                    <button key={value} type="button" onClick={() => setPhotoPose(value)} className={`min-h-9 rounded-xl border text-[11px] font-bold ${photoPose === value ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-border bg-background text-muted-foreground'}`}>{label}</button>
                                ))}
                            </div>
                        </div>

                        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-background p-3">
                            <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
                            <span className="text-[11px] leading-4 text-muted-foreground">
                                Autorizo voluntariamente a <strong className="text-foreground">{trainerName}</strong> a usar esta foto, junto con otras fotos autorizadas, para mostrar mi progreso en redes sociales. Puedo retirar el permiso cuando quiera.
                            </span>
                        </label>
                        {!marketingConsent && <p className="text-[10px] text-muted-foreground">Si no marcás la autorización, la foto seguirá siendo privada y no podrá exportarse para marketing.</p>}
                    </div>
                )}
            </section>

            {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">{error}</p>}
            {saved && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-500">
                    <Check className="h-4 w-4" />
                    Control enviado a tu entrenador.
                </div>
            )}

            <button type="button" onClick={submit} disabled={pending} className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 text-sm font-black text-white transition active:scale-[0.99] disabled:opacity-50">
                {pending ? (photo ? 'Guardando y subiendo foto…' : 'Guardando…') : initialValue ? 'Actualizar control' : 'Enviar control semanal'}
            </button>
            <Link href="/app" className="block py-2 text-center text-xs font-semibold text-muted-foreground">Volver al inicio</Link>
        </div>
    )
}

async function compressProgressPhoto(file: File) {
    const bitmap = await createImageBitmap(file)
    const maxSide = 1600
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No pudimos procesar la imagen.')
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('No pudimos comprimir la imagen.')),
            'image/jpeg',
            0.84
        )
    })
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
