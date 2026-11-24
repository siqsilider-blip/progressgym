'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, Film, LoaderCircle, Send, Square, Trash2, Video, X } from 'lucide-react'
import {
    cancelTechniqueVideoSubmission,
    createTechniqueVideoSubmission,
    finalizeTechniqueVideoSubmission,
} from '@/app/coaching/actions'
import { supabase } from '@/lib/supabase/client'
import {
    chooseTechniqueVideoRecorderMimeType,
    getTechniqueVideoExtension,
    TECHNIQUE_VIDEO_CAPTURE_BITRATE,
    TECHNIQUE_VIDEO_MAX_DURATION_SECONDS,
    validateTechniqueVideoFile,
} from '@/lib/techniqueVideo'

type SelectedVideo = {
    file: File
    previewUrl: string
    durationSeconds: number
}

type CameraState = 'idle' | 'requesting' | 'ready' | 'recording'

type Props = {
    studentUserId: string
    workoutSessionId: string
    routineDayExerciseId: string
    exerciseName: string
    canSubmit: boolean
}

function readVideoDuration(file: File) {
    return new Promise<number>((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const video = document.createElement('video')
        const timeout = window.setTimeout(() => finish(null), 12_000)

        function finish(duration: number | null) {
            window.clearTimeout(timeout)
            video.removeAttribute('src')
            video.load()
            URL.revokeObjectURL(url)
            if (duration != null && Number.isFinite(duration) && duration > 0) resolve(duration)
            else reject(new Error('VIDEO_DURATION_UNAVAILABLE'))
        }

        video.preload = 'metadata'
        video.onloadedmetadata = () => finish(video.duration)
        video.onerror = () => finish(null)
        video.src = url
    })
}

function formatFileSize(size: number) {
    return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

export default function TechniqueVideoUploader({
    studentUserId,
    workoutSessionId,
    routineDayExerciseId,
    exerciseName,
    canSubmit,
}: Props) {
    const router = useRouter()
    const [open, setOpen] = React.useState(false)
    const [cameraState, setCameraState] = React.useState<CameraState>('idle')
    const [recordingSeconds, setRecordingSeconds] = React.useState(0)
    const [selected, setSelected] = React.useState<SelectedVideo | null>(null)
    const [note, setNote] = React.useState('')
    const [error, setError] = React.useState('')
    const [uploading, setUploading] = React.useState(false)
    const [success, setSuccess] = React.useState(false)

    const galleryInputRef = React.useRef<HTMLInputElement | null>(null)
    const fallbackCameraInputRef = React.useRef<HTMLInputElement | null>(null)
    const cameraPreviewRef = React.useRef<HTMLVideoElement | null>(null)
    const streamRef = React.useRef<MediaStream | null>(null)
    const recorderRef = React.useRef<MediaRecorder | null>(null)
    const chunksRef = React.useRef<Blob[]>([])
    const elapsedTimerRef = React.useRef<number | null>(null)
    const stopTimerRef = React.useRef<number | null>(null)
    const recordingStartedAtRef = React.useRef(0)
    const discardRecordingRef = React.useRef(false)

    const clearRecordingTimers = React.useCallback(() => {
        if (elapsedTimerRef.current != null) window.clearInterval(elapsedTimerRef.current)
        if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current)
        elapsedTimerRef.current = null
        stopTimerRef.current = null
    }, [])

    const stopCameraTracks = React.useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = null
    }, [])

    const stopCamera = React.useCallback((discardRecording = true) => {
        clearRecordingTimers()
        const recorder = recorderRef.current
        if (recorder?.state === 'recording') {
            discardRecordingRef.current = discardRecording
            recorder.stop()
        } else {
            recorderRef.current = null
            stopCameraTracks()
            setCameraState('idle')
        }
    }, [clearRecordingTimers, stopCameraTracks])

    const clearSelected = React.useCallback(() => {
        setSelected((current) => {
            if (current) URL.revokeObjectURL(current.previewUrl)
            return null
        })
    }, [])

    const resetAndClose = React.useCallback(() => {
        stopCamera(true)
        clearSelected()
        setNote('')
        setError('')
        setSuccess(false)
        setUploading(false)
        setRecordingSeconds(0)
        setOpen(false)
    }, [clearSelected, stopCamera])

    React.useEffect(() => {
        if (!open) return
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [open])

    React.useEffect(() => () => {
        stopCamera(true)
        clearSelected()
    }, [clearSelected, stopCamera])

    async function prepareVideo(file: File, knownDuration?: number) {
        setError('')
        const fileError = validateTechniqueVideoFile(file)
        if (fileError) {
            setError(fileError)
            return
        }

        let durationSeconds = knownDuration
        if (durationSeconds == null) {
            try {
                durationSeconds = await readVideoDuration(file)
            } catch {
                setError('No pudimos leer este video. Probá grabarlo desde Progrezzia o elegí otro archivo.')
                return
            }
        }

        const durationError = validateTechniqueVideoFile(file, durationSeconds)
        if (durationError) {
            setError(durationError)
            return
        }

        stopCamera(false)
        clearSelected()
        setSelected({
            file,
            durationSeconds: Math.min(TECHNIQUE_VIDEO_MAX_DURATION_SECONDS, durationSeconds),
            previewUrl: URL.createObjectURL(file),
        })
    }

    async function startCamera() {
        setError('')
        if (!canSubmit) {
            setError(`Guardá al menos una serie de ${exerciseName} antes de enviar el video.`)
            return
        }

        const mimeType = chooseTechniqueVideoRecorderMimeType()
        if (!navigator.mediaDevices?.getUserMedia || mimeType == null) {
            fallbackCameraInputRef.current?.click()
            return
        }

        setCameraState('requesting')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280, max: 1280 },
                    height: { ideal: 720, max: 720 },
                    frameRate: { ideal: 30, max: 30 },
                },
                audio: false,
            })
            streamRef.current = stream
            setCameraState('ready')
            window.setTimeout(() => {
                if (!cameraPreviewRef.current) return
                cameraPreviewRef.current.srcObject = stream
                void cameraPreviewRef.current.play()
            }, 0)
        } catch (cameraError) {
            console.error('[TechniqueVideoUploader] camera:', cameraError)
            stopCameraTracks()
            setCameraState('idle')
            setError('No pudimos abrir la cámara. Revisá el permiso o elegí un video de la galería.')
        }
    }

    function beginRecording() {
        const stream = streamRef.current
        const mimeType = chooseTechniqueVideoRecorderMimeType()
        if (!stream || mimeType == null) {
            setError('La cámara no está disponible. Elegí un video de la galería.')
            return
        }

        try {
            const recorder = new MediaRecorder(stream, {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: TECHNIQUE_VIDEO_CAPTURE_BITRATE,
            })
            chunksRef.current = []
            discardRecordingRef.current = false
            recorderRef.current = recorder
            recordingStartedAtRef.current = Date.now()
            setRecordingSeconds(0)

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data)
            }
            recorder.onerror = () => {
                setError('La grabación se interrumpió. Volvé a intentarlo.')
            }
            recorder.onstop = () => {
                clearRecordingTimers()
                const discarded = discardRecordingRef.current
                const elapsed = Math.max(1, Math.min(
                    TECHNIQUE_VIDEO_MAX_DURATION_SECONDS,
                    (Date.now() - recordingStartedAtRef.current) / 1000
                ))
                const outputType = recorder.mimeType || mimeType || 'video/webm'
                const blob = new Blob(chunksRef.current, { type: outputType })
                const extension = outputType.toLowerCase().includes('mp4') ? 'mp4' : 'webm'
                recorderRef.current = null
                stopCameraTracks()
                setCameraState('idle')
                setRecordingSeconds(0)
                if (discarded) return
                const file = new File([blob], `tecnica-${Date.now()}.${extension}`, { type: outputType })
                void prepareVideo(file, elapsed)
            }

            recorder.start(500)
            setCameraState('recording')
            elapsedTimerRef.current = window.setInterval(() => {
                setRecordingSeconds(Math.min(
                    TECHNIQUE_VIDEO_MAX_DURATION_SECONDS,
                    Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)
                ))
            }, 250)
            stopTimerRef.current = window.setTimeout(() => {
                if (recorder.state === 'recording') recorder.stop()
            }, TECHNIQUE_VIDEO_MAX_DURATION_SECONDS * 1000)
        } catch (recordingError) {
            console.error('[TechniqueVideoUploader] recorder:', recordingError)
            setError('Este dispositivo no pudo iniciar la grabación. Elegí un video de la galería.')
            stopCamera(false)
        }
    }

    async function submitVideo() {
        if (!selected || uploading) return
        if (!canSubmit) {
            setError(`Guardá al menos una serie de ${exerciseName} antes de enviar el video.`)
            return
        }

        setUploading(true)
        setError('')
        let submissionId: string | null = null
        let storagePath: string | null = null

        try {
            const extension = getTechniqueVideoExtension(selected.file)
            if (!extension) throw new Error('VIDEO_FORMAT_INVALID')

            const reservation = await createTechniqueVideoSubmission({
                workoutSessionId,
                routineDayExerciseId,
                durationSeconds: selected.durationSeconds,
                fileExtension: extension,
                note,
            })
            if (!reservation.ok || !reservation.submissionId || !reservation.storagePath) {
                throw new Error(reservation.error ?? 'No pudimos preparar el envío.')
            }
            submissionId = reservation.submissionId
            storagePath = reservation.storagePath
            if (!storagePath.startsWith(`${studentUserId}/`)) {
                throw new Error('No pudimos validar el destino privado del video.')
            }

            const { error: uploadError } = await supabase.storage
                .from('technique-videos')
                .upload(storagePath, selected.file, {
                    contentType: selected.file.type.split(';')[0]
                        || (extension === 'mov' ? 'video/quicktime' : `video/${extension}`),
                    cacheControl: '3600',
                    upsert: false,
                })
            if (uploadError) throw new Error('No pudimos subir el video. Revisá tu conexión y volvé a intentarlo.')

            const finalized = await finalizeTechniqueVideoSubmission(submissionId)
            if (!finalized.ok) throw new Error(finalized.error ?? 'No pudimos confirmar el envío.')

            setSuccess(true)
            clearSelected()
            setNote('')
            router.refresh()
        } catch (submissionError) {
            let cleanupSucceeded = storagePath == null
            if (storagePath) {
                const { error: cleanupError } = await supabase.storage
                    .from('technique-videos')
                    .remove([storagePath])
                cleanupSucceeded = cleanupError == null
            }
            // Si Storage no responde, conservamos la reserva: el proceso de
            // expiración podrá encontrar la ruta y limpiar el objeto sin dejarlo huérfano.
            if (submissionId && cleanupSucceeded) {
                await cancelTechniqueVideoSubmission(submissionId)
            }
            setError(submissionError instanceof Error ? submissionError.message : 'No pudimos enviar el video.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setOpen(true)
                    setError('')
                    setSuccess(false)
                }}
                aria-haspopup="dialog"
                className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98] hover:border-primary/40"
            >
                <Video className="h-5 w-5 text-primary" aria-hidden="true" />
                Enviar video
            </button>

            <input
                ref={galleryInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="sr-only"
                onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) void prepareVideo(file)
                }}
            />
            <input
                ref={fallbackCameraInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) void prepareVideo(file)
                }}
            />

            {open && (
                <div
                    className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !uploading) resetAndClose()
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`technique-video-${routineDayExerciseId}`}
                        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl"
                    >
                        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-primary">Corrección de técnica</p>
                                <h2 id={`technique-video-${routineDayExerciseId}`} className="truncate text-lg font-black text-foreground">
                                    {exerciseName}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={resetAndClose}
                                disabled={uploading}
                                aria-label="Cerrar envío de video"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground disabled:opacity-50"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </header>

                        <div className="space-y-4 p-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}>
                            {success ? (
                                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
                                        <Check className="h-7 w-7" aria-hidden="true" />
                                    </span>
                                    <h3 className="mt-3 text-lg font-black text-foreground">Video enviado</h3>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        Tu entrenador recibió el video de {exerciseName} y podrá responderte desde Progrezzia.
                                    </p>
                                    <button type="button" onClick={resetAndClose} className="mt-4 min-h-12 w-full rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">
                                        Listo
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-2xl border border-border bg-card p-4">
                                        <p className="text-sm font-bold text-foreground">Mostrá el movimiento completo</p>
                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                            Filmate de costado o en diagonal, con el cuerpo entero visible. Máximo 30 segundos y 50 MB.
                                        </p>
                                    </div>

                                    {!canSubmit && (
                                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold leading-5 text-amber-500">
                                            Guardá al menos una serie de este ejercicio antes de enviar el video. Así queda asociado al entrenamiento correcto.
                                        </div>
                                    )}

                                    {cameraState !== 'idle' && !selected && (
                                        <div className="overflow-hidden rounded-2xl border border-border bg-black">
                                            {cameraState === 'requesting' ? (
                                                <div className="flex aspect-[3/4] items-center justify-center text-sm text-white">
                                                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Abriendo cámara…
                                                </div>
                                            ) : (
                                                <>
                                                    <video ref={cameraPreviewRef} muted playsInline className="aspect-[3/4] w-full object-cover" />
                                                    <div className="flex items-center justify-between gap-3 bg-black/90 p-3">
                                                        <span className="text-sm font-bold text-white">
                                                            {cameraState === 'recording' ? `Grabando · ${recordingSeconds}/30 s` : 'Cámara lista'}
                                                        </span>
                                                        {cameraState === 'recording' ? (
                                                            <button type="button" onClick={() => stopCamera(false)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white">
                                                                <Square className="h-4 w-4 fill-current" /> Detener
                                                            </button>
                                                        ) : (
                                                            <button type="button" onClick={beginRecording} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">
                                                                <span className="h-3 w-3 rounded-full bg-red-500" /> Grabar
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {selected ? (
                                        <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card">
                                            <video src={selected.previewUrl} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" />
                                            <div className="flex items-center justify-between gap-3 p-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-foreground">Video listo</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {Math.ceil(selected.durationSeconds)} s · {formatFileSize(selected.file.size)}
                                                    </p>
                                                </div>
                                                <button type="button" onClick={clearSelected} disabled={uploading} className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground">
                                                    <Trash2 className="h-4 w-4" /> Cambiar
                                                </button>
                                            </div>
                                        </div>
                                    ) : cameraState === 'idle' ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void startCamera()}
                                                disabled={!canSubmit || uploading}
                                                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm font-black text-primary disabled:opacity-45"
                                            >
                                                <Camera className="h-6 w-6" />
                                                Grabar ahora
                                                <span className="text-[10px] font-medium text-muted-foreground">720p · máximo 30 s</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => galleryInputRef.current?.click()}
                                                disabled={!canSubmit || uploading}
                                                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm font-black text-foreground disabled:opacity-45"
                                            >
                                                <Film className="h-6 w-6 text-primary" />
                                                Elegir galería
                                                <span className="text-[10px] font-medium text-muted-foreground">MP4, MOV o WebM</span>
                                            </button>
                                        </div>
                                    ) : null}

                                    <label className="block rounded-2xl border border-border bg-card p-4">
                                        <span className="text-sm font-bold text-foreground">¿Qué querés que revise? <span className="font-normal text-muted-foreground">(opcional)</span></span>
                                        <textarea
                                            value={note}
                                            onChange={(event) => setNote(event.target.value.slice(0, 500))}
                                            disabled={uploading}
                                            rows={3}
                                            placeholder="Ej.: no sé si estoy bajando suficiente o si la espalda está bien."
                                            className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                                        />
                                        <span className="mt-1 block text-right text-[10px] text-muted-foreground">{note.length}/500</span>
                                    </label>

                                    {error && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm font-semibold leading-5 text-red-500">{error}</p>}

                                    {uploading && (
                                        <div className="rounded-xl border border-primary/25 bg-primary/10 p-3" aria-live="polite">
                                            <div className="flex items-center gap-2 text-sm font-bold text-primary">
                                                <LoaderCircle className="h-4 w-4 animate-spin" /> Subiendo video…
                                            </div>
                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
                                                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
                                            </div>
                                            <p className="mt-2 text-[10px] text-muted-foreground">No cierres la aplicación hasta que termine.</p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => void submitVideo()}
                                        disabled={!canSubmit || !selected || uploading || cameraState === 'recording'}
                                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-45"
                                    >
                                        {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                        {uploading ? 'Enviando…' : 'Enviar a mi entrenador'}
                                    </button>

                                    <p className="text-center text-[10px] leading-4 text-muted-foreground">
                                        El video es privado: solo pueden verlo vos y tu entrenador. Se elimina automáticamente después de 30 días.
                                    </p>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </>
    )
}
