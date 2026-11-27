import { expect, test } from '@playwright/test'
import { parseExerciseVideoUrl } from '../../src/lib/exerciseVideoUrl'

test('permite enlaces web completos y conserva sus parámetros de video', () => {
    expect(parseExerciseVideoUrl(' https://youtu.be/abcdef?t=30 ')?.href).toBe('https://youtu.be/abcdef?t=30')
    expect(parseExerciseVideoUrl('http://example.test/clase.mp4')?.pathname).toBe('/clase.mp4')
})

test('omite enlaces vacíos, inválidos o ajenos a la web', () => {
    for (const value of [null, ' ', 'video.mp4', 'file:///video.mp4', 'https://usuario@example.test']) {
        expect(parseExerciseVideoUrl(value)).toBeNull()
    }
})
