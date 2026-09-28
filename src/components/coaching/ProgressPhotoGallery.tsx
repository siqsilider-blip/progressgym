'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Download, Images, ShieldCheck, Trash2 } from 'lucide-react'
import { deleteProgressPhoto, getProgressPhotoComparisonExport, setProgressPhotoMarketingConsent } from '@/app/coaching/actions'

export type ProgressPhotoItem = {
    id: string
    url: string
    capturedOn: string
    pose: 'front' | 'side' | 'back'
    marketingConsent: boolean
}

const POSE_LABELS = { front: 'Frente', side: 'Perfil', back: 'Espalda' }

export default function ProgressPhotoGallery({
    photos,
    role,
}: {
    photos: ProgressPhotoItem[]
    role: 'student' | 'trainer'
}) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const eligiblePhotos = useMemo(
        () => role === 'trainer' ? photos.filter((photo) => photo.marketingConsent) : photos,
        [photos, role]
    )
    const [beforeId, setBeforeId] = useState(eligiblePhotos[0]?.id ?? '')
    const [afterId, setAfterId] = useState(eligiblePhotos[eligiblePhotos.length - 1]?.id ?? '')
    const [exporting, setExporting] = useState(false)

    function updateConsent(photo: ProgressPhotoItem) {
        const next = !photo.marketingConsent
        if (next && !window.confirm('¿Autorizás a tu entrenador a usar esta foto para mostrar tu progreso en redes sociales? Podés retirar el permiso cuando quieras.')) return
        setError('')
        startTransition(async () => {
            const result = await setProgressPhotoMarketingConsent(photo.id, next)
            if (!result.ok) setError(result.error ?? 'No pudimos actualizar el permiso.')
            else router.refresh()
        })
    }

    function removePhoto(photo: ProgressPhotoItem) {
        if (!window.confirm('¿Eliminar esta foto de progreso? Esta acción no se puede deshacer.')) return
        setError('')
        startTransition(async () => {
            const result = await deleteProgressPhoto(photo.id)
            if (!result.ok) setError(result.error ?? 'No pudimos eliminar la foto.')
            else router.refresh()
        })
    }

    async function exportComparison() {
        let before = eligiblePhotos.find((photo) => photo.id === beforeId)
        let after = eligiblePhotos.find((photo) => photo.id === afterId)
        if (!before || !after || before.id === after.id) {
            setError('Elegí dos fotos diferentes para comparar.')
            return
        }

        setError('')
        setExporting(true)
        try {
            if (role === 'trainer') {
                const exportData = await getProgressPhotoComparisonExport(before.id, after.id)
                if (!exportData.ok || !exportData.photos) {
                    throw new Error(exportData.error ?? 'Las fotos no tienen autorización vigente.')
                }
                const beforeFresh = exportData.photos.find((photo) => photo.id === before?.id)
                const afterFresh = exportData.photos.find((photo) => photo.id === after?.id)
                if (!beforeFresh || !afterFresh) throw new Error('No pudimos validar las fotos.')
                before = { ...before, url: beforeFresh.url, capturedOn: beforeFresh.capturedOn }
                after = { ...after, url: afterFresh.url, capturedOn: afterFresh.capturedOn }
            }
            await createComparison(before, after)
        } catch (exportError) {
            console.error('[exportProgressComparison]', exportError)
            setError(exportError instanceof Error ? exportError.message : 'No pudimos crear la comparativa. Probá nuevamente.')
        } finally {
            setExporting(false)
        }
    }

    if (photos.length === 0) {
        return role === 'student' ? (
            <section className="mb-4 rounded-2xl border border-dashed border-border p-4">
                <div className="flex items-center gap-2">
                    <Images className="h-4 w-4 text-indigo-500" />
                    <p className="text-sm font-bold text-foreground">Fotos de progreso</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Todavía no cargaste fotos. Podés agregar una desde el control semanal.</p>
            </section>
        ) : null
    }

    return (
        <section className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Images className="h-4 w-4 text-indigo-500" />
                        <p className="text-sm font-bold text-foreground">Fotos de progreso</p>
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                        {role === 'trainer' ? 'Privadas. Solo las autorizadas pueden exportarse para redes.' : 'Solo vos y tu entrenador pueden verlas.'}
                    </p>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{photos.length} {photos.length === 1 ? 'foto' : 'fotos'}</span>
            </div>

            <div className="flex gap-2 overflow-x-auto px-4 pb-4">
                {photos.map((photo) => (
                    <article key={photo.id} className="w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                        <div className="relative aspect-[3/4] bg-black">
                            <Image src={photo.url} alt={`Progreso del ${formatPhotoDate(photo.capturedOn)}`} fill unoptimized className="object-contain" />
                            <span className={`absolute left-2 top-2 rounded-md px-1.5 py-1 text-[8px] font-black ${photo.marketingConsent ? 'bg-emerald-500 text-white' : 'bg-black/70 text-white/75'}`}>
                                {photo.marketingConsent ? 'REDES ✓' : 'PRIVADA'}
                            </span>
                        </div>
                        <div className="p-2.5">
                            <p className="text-[11px] font-bold text-foreground">{formatPhotoDate(photo.capturedOn)}</p>
                            <p className="text-[9px] text-muted-foreground">{POSE_LABELS[photo.pose]}</p>
                            {role === 'student' ? (
                                <div className="mt-2 grid grid-cols-[1fr_auto] gap-1">
                                    <button type="button" disabled={pending} onClick={() => updateConsent(photo)} className={`min-h-8 rounded-lg px-1.5 text-[9px] font-bold ${photo.marketingConsent ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                                        {photo.marketingConsent ? 'Retirar permiso' : 'Autorizar redes'}
                                    </button>
                                    <button type="button" disabled={pending} onClick={() => removePhoto(photo)} aria-label="Eliminar foto" className="flex min-h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                            ) : photo.marketingConsent ? (
                                <button type="button" onClick={() => downloadRemoteImage(photo.url, `progreso-${photo.capturedOn}.jpg`)} className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-lg bg-emerald-500/10 text-[9px] font-bold text-emerald-500"><Download className="h-3 w-3" /> Descargar autorizada</button>
                            ) : (
                                <p className="mt-2 text-[9px] leading-3 text-muted-foreground">Sin permiso de publicación.</p>
                            )}
                        </div>
                    </article>
                ))}
            </div>

            <div className="border-t border-border p-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs font-bold text-foreground">Crear comparativa Antes / Ahora</p>
                </div>
                {eligiblePhotos.length >= 2 ? (
                    <>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <PhotoSelect label="Antes" value={beforeId} onChange={setBeforeId} photos={eligiblePhotos} />
                            <PhotoSelect label="Ahora" value={afterId} onChange={setAfterId} photos={eligiblePhotos} />
                        </div>
                        <button type="button" onClick={exportComparison} disabled={exporting} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-50">
                            <Download className="h-4 w-4" />
                            {exporting ? 'Creando imagen…' : 'Descargar comparativa'}
                        </button>
                        <p className="mt-2 text-[9px] leading-4 text-muted-foreground">La exportación no agrega el nombre del alumno. Antes de publicar, confirmá que el permiso siga vigente.</p>
                    </>
                ) : (
                    <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                        {role === 'trainer' ? 'Necesitás al menos dos fotos con autorización vigente.' : 'Necesitás al menos dos fotos para crear una comparativa.'}
                    </p>
                )}
                {error && <p className="mt-2 text-[10px] font-medium text-red-500">{error}</p>}
            </div>
        </section>
    )
}

function PhotoSelect({ label, value, onChange, photos }: { label: string; value: string; onChange: (value: string) => void; photos: ProgressPhotoItem[] }) {
    return (
        <label className="text-[10px] font-bold text-muted-foreground">
            {label}
            <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-2 text-xs font-semibold text-foreground outline-none">
                {photos.map((photo) => <option key={photo.id} value={photo.id}>{formatPhotoDate(photo.capturedOn)} · {POSE_LABELS[photo.pose]}</option>)}
            </select>
        </label>
    )
}

async function createComparison(before: ProgressPhotoItem, after: ProgressPhotoItem) {
    const [beforeImage, afterImage] = await Promise.all([loadImage(before.url), loadImage(after.url)])
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1350
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas no disponible')

    context.fillStyle = '#07070a'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.font = '700 42px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText('PROGRESO', 540, 65)
    context.fillStyle = '#8b5cf6'
    context.font = '700 24px system-ui, sans-serif'
    context.fillText('PROGREZZIA', 540, 104)

    const margin = 36
    const gap = 20
    const imageWidth = (canvas.width - margin * 2 - gap) / 2
    const imageHeight = 1080
    const imageY = 140
    drawContained(context, beforeImage, margin, imageY, imageWidth, imageHeight)
    drawContained(context, afterImage, margin + imageWidth + gap, imageY, imageWidth, imageHeight)

    context.fillStyle = 'rgba(7,7,10,0.88)'
    context.fillRect(margin, imageY, imageWidth, 58)
    context.fillRect(margin + imageWidth + gap, imageY, imageWidth, 58)
    context.fillStyle = '#ffffff'
    context.font = '800 28px system-ui, sans-serif'
    context.fillText('ANTES', margin + imageWidth / 2, imageY + 39)
    context.fillText('AHORA', margin + imageWidth + gap + imageWidth / 2, imageY + 39)

    context.fillStyle = '#a1a1aa'
    context.font = '500 22px system-ui, sans-serif'
    context.fillText(formatPhotoDate(before.capturedOn), margin + imageWidth / 2, 1270)
    context.fillText(formatPhotoDate(after.capturedOn), margin + imageWidth + gap + imageWidth / 2, 1270)

    beforeImage.close()
    afterImage.close()

    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo exportar')), 'image/jpeg', 0.92))
    downloadBlob(blob, `progrezzia-antes-despues-${after.capturedOn}.jpg`)
}

async function loadImage(url: string) {
    const response = await fetch(url)
    if (!response.ok) throw new Error('No se pudo cargar la imagen')
    return await createImageBitmap(await response.blob())
}

function drawContained(context: CanvasRenderingContext2D, image: ImageBitmap, x: number, y: number, width: number, height: number) {
    context.fillStyle = '#111116'
    context.fillRect(x, y, width, height)
    const scale = Math.min(width / image.width, height / image.height)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}

async function downloadRemoteImage(url: string, filename: string) {
    const response = await fetch(url)
    if (!response.ok) return
    downloadBlob(await response.blob(), filename)
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
}

function formatPhotoDate(value: string) {
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
