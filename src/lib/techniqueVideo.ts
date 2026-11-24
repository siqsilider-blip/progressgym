export const TECHNIQUE_VIDEO_MAX_DURATION_SECONDS = 30
export const TECHNIQUE_VIDEO_MAX_BYTES = 50 * 1024 * 1024
export const TECHNIQUE_VIDEO_CAPTURE_BITRATE = 2_500_000

export type TechniqueVideoFileLike = {
    name: string
    size: number
    type: string
}

const SUPPORTED_MIME_TYPES = new Set([
    'video/mp4',
    'video/quicktime',
    'video/webm',
])

const SUPPORTED_EXTENSIONS = new Set(['mp4', 'mov', 'webm'])

export function getTechniqueVideoExtension(file: Pick<TechniqueVideoFileLike, 'name' | 'type'>) {
    const normalizedType = file.type.toLowerCase().split(';')[0]
    if (normalizedType === 'video/mp4') return 'mp4'
    if (normalizedType === 'video/quicktime') return 'mov'
    if (normalizedType === 'video/webm') return 'webm'

    const extension = file.name.toLowerCase().split('.').pop() ?? ''
    return SUPPORTED_EXTENSIONS.has(extension) ? extension : null
}

export function validateTechniqueVideoFile(
    file: TechniqueVideoFileLike,
    durationSeconds?: number | null
) {
    const normalizedType = file.type.toLowerCase().split(';')[0]
    if (!SUPPORTED_MIME_TYPES.has(normalizedType) && !getTechniqueVideoExtension(file)) {
        return 'Elegí un video MP4, MOV o WebM.'
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
        return 'El video está vacío o no se pudo leer.'
    }
    if (file.size > TECHNIQUE_VIDEO_MAX_BYTES) {
        return 'El video supera los 50 MB. Grabalo desde Progrezzia o recortalo antes de enviarlo.'
    }
    if (durationSeconds != null) {
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
            return 'No pudimos leer la duración del video.'
        }
        if (durationSeconds > TECHNIQUE_VIDEO_MAX_DURATION_SECONDS) {
            return 'El video puede durar hasta 30 segundos. Recortalo y volvé a intentarlo.'
        }
    }
    return null
}

export function chooseTechniqueVideoRecorderMimeType() {
    if (typeof MediaRecorder === 'undefined') return null

    const candidates = [
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4',
        'video/webm;codecs=vp8',
        'video/webm',
    ]

    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ''
}
