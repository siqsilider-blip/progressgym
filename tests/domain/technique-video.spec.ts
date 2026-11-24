import { expect, test } from '@playwright/test'
import {
    getTechniqueVideoExtension,
    TECHNIQUE_VIDEO_MAX_BYTES,
    validateTechniqueVideoFile,
} from '../../src/lib/techniqueVideo'

test.describe('technique video validation', () => {
    test('accepts the supported mobile formats', () => {
        expect(validateTechniqueVideoFile({ name: 'serie.mp4', type: 'video/mp4', size: 8_000_000 }, 24)).toBeNull()
        expect(validateTechniqueVideoFile({ name: 'serie.mov', type: 'video/quicktime', size: 8_000_000 }, 24)).toBeNull()
        expect(validateTechniqueVideoFile({ name: 'serie.webm', type: 'video/webm', size: 8_000_000 }, 24)).toBeNull()
    })

    test('uses the extension when a mobile picker omits the MIME type', () => {
        expect(getTechniqueVideoExtension({ name: 'TECNICA.MOV', type: '' })).toBe('mov')
        expect(validateTechniqueVideoFile({ name: 'TECNICA.MOV', type: '', size: 8_000_000 }, 24)).toBeNull()
    })

    test('rejects videos over the storage or duration limit', () => {
        expect(validateTechniqueVideoFile({
            name: 'large.mp4',
            type: 'video/mp4',
            size: TECHNIQUE_VIDEO_MAX_BYTES + 1,
        }, 20)).toContain('50 MB')
        expect(validateTechniqueVideoFile({ name: 'long.mp4', type: 'video/mp4', size: 8_000_000 }, 31)).toContain('30 segundos')
    })

    test('rejects empty and unsupported files', () => {
        expect(validateTechniqueVideoFile({ name: 'image.jpg', type: 'image/jpeg', size: 1000 }, 10)).toContain('MP4')
        expect(validateTechniqueVideoFile({ name: 'empty.mp4', type: 'video/mp4', size: 0 }, 10)).toContain('vacío')
    })
})
