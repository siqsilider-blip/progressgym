'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Camera, Check, ChevronDown, X } from 'lucide-react'
import { deleteProgressPhoto, registerProgressPhoto, saveWeeklyCheckin } from '@/app/coaching/actions'
import { supabase } from '@/lib/supabase/client'

type PhotoPose = 'front' | 'side' | 'back'

type SelectedProgressPhoto = {
    file: File
    preview: string
}

const PHOTO_POSES: { value: PhotoPose; label: string }[] = [
    { value: 'front', label: 'Frente' },
    { value: 'side', label: 'Perfil' },
    { value: 'back', label: 'Espalda' },
]

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
    const [photos, setPhotos] = useState<Partial<Record<PhotoPose, SelectedProgressPhoto>>>({})
    const [marketingConsent, setMarketingConsent] = useState(false)
    const [saved, setSaved] = useState(Boolean(initialValue))
    const [error, setError] = useState('')
    const [pending, startTransition] = useTransition()

    const selectedPhotoCount = PHOTO_POSES.filter(({ value }) => photos[value]).length

    function selectPhoto(pose: PhotoPose, selected: File | null) {
        if (!selected) return
        if (!selected.type.startsWith('image/')) {
            setError('Elegí una imagen válida.')
            return
        }
        if (selected.size > 20 * 1024 * 1024) {
            setError('Cada imagen original puede pesar hasta 20 MB.')
            return
        }

        setError('')
        setPhotos((current) => {
            const previous = current[pose]
            if (previous) URL.revokeObjectURL(previous.preview)
            return {
                ...current,
                [pose]: { file: selected, preview: URL.createObjectURL(selected) },
            }
        })
    }

    function removePhoto(pose: PhotoPose) {
        setPhotos((current) => {
            const selected = current[pose]
            if (selected) URL.revokeObjectURL(selected.preview)
            const next = { ...current }
            delete next[pose]
            return next
        })
    }

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

            const photosToUpload = PHOTO_POSES.flatMap(({ value }) => {
                const selected = photos[value]
                return selected ? [{ pose: value, ...selected }] : []
            })

            if (photosToUpload.length > 0) {
                const registeredPhotoIds: string[] = []
                const uploadedPaths = new Set<string>()
                try {
                    for (const selected of photosToUpload) {
                        const compressed = await compressProgressPhoto(selected.file)
                        const storagePath = `${studentUserId}/${crypto.randomUUID()}.jpg`
                        const { error: uploadError } = await supabase.storage
                            .from('progress-photos')
                            .upload(storagePath, compressed, {
                                contentType: 'image/jpeg',
                                cacheControl: '3600',
                                upsert: false,
                            })
                        if (uploadError) throw new Error(`No pudimos subir la foto de ${poseLabel(selected.pose).toLowerCase()}.`)
                        uploadedPaths.add(storagePath)

                        const registration = await registerProgressPhoto({
                            checkinId: result.checkinId,
                            storagePath,
                            pose: selected.pose,
                            marketingConsent,
                        })
                        if (!registration.ok || !registration.photoId) {
                            throw new Error(registration.error ?? `No pudimos guardar la foto de ${poseLabel(selected.pose).toLowerCase()}.`)
                        }
                        uploadedPaths.delete(storagePath)
                        registeredPhotoIds.push(registration.photoId)
                    }

                    photosToUpload.forEach(({ preview }) => URL.revokeObjectURL(preview))
                    setPhotos({})
                    setMarketingConsent(false)
                } catch (photoError) {
                    await Promise.allSettled(registeredPhotoIds.map((photoId) => deleteProgressPhoto(photoId)))
                    if (uploadedPaths.size > 0) {
                        await supabase.storage.from('progress-photos').remove([...uploadedPaths])
                    }
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

                <p className="mt-3 text-[11px] font-semibold text-foreground">Podés cargar una, dos o las tres posiciones.</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                    {PHOTO_POSES.map(({ value, label }) => {
                        const selected = photos[value]
                        return (
                            <div key={value} className="relative overflow-hidden rounded-xl border border-border bg-background">
                                <p className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                                {selected ? (
                                    <>
                                        <label className="relative block aspect-[3/4] cursor-pointer overflow-hidden bg-black">
                                            <Image src={selected.preview} alt={`Vista previa: ${label}`} fill unoptimized className="object-cover" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="sr-only"
                                                onChange={(event) => {
                                                    selectPhoto(value, event.target.files?.[0] ?? null)
                                                    event.target.value = ''
                                                }}
                                            />
                                        </label>
                                        <button type="button" onClick={() => removePhoto(value)} aria-label={`Quitar foto de ${label}`} className="absolute right-1.5 top-8 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white">
                                            <X className="h-4 w-4" />
                                        </button>
                                        <p className="px-1 py-1.5 text-center text-[9px] font-semibold text-indigo-500">Tocá para cambiar</p>
                                    </>
                                ) : (
                                    <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 border-t border-dashed border-indigo-500/25 bg-indigo-500/[0.04] px-1 text-center text-[10px] font-bold text-indigo-500">
                                        <Camera className="h-5 w-5" />
                                        Agregar
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            onChange={(event) => {
                                                selectPhoto(value, event.target.files?.[0] ?? null)
                                                event.target.value = ''
                                            }}
                                        />
                                    </label>
                                )}
                            </div>
                        )
                    })}
                </div>

                {selectedPhotoCount > 0 && (
                    <div className="mt-3 space-y-3">
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
                {pending ? (selectedPhotoCount > 0 ? `Guardando y subiendo ${selectedPhotoCount === 1 ? 'foto' : 'fotos'}…` : 'Guardando…') : initialValue ? 'Actualizar control' : 'Enviar control semanal'}
            </button>
            <Link href="/app" className="block py-2 text-center text-xs font-semibold text-muted-foreground">Volver al inicio</Link>
        </div>
    )
}

function poseLabel(pose: PhotoPose) {
    return PHOTO_POSES.find((item) => item.value === pose)?.label ?? 'foto'
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
