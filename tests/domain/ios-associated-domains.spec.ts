import { expect, test } from '@playwright/test'
import { GET } from '../../src/app/api/ios/apple-app-site-association/route'

function associationFor(prefix?: string) {
    const original = process.env.IOS_APP_LINK_APP_ID_PREFIX
    try {
        if (prefix === undefined) delete process.env.IOS_APP_LINK_APP_ID_PREFIX
        else process.env.IOS_APP_LINK_APP_ID_PREFIX = prefix
        return GET()
    } finally {
        if (original === undefined) delete process.env.IOS_APP_LINK_APP_ID_PREFIX
        else process.env.IOS_APP_LINK_APP_ID_PREFIX = original
    }
}

test('publica el identificador iOS y solo las rutas que abre la app', async () => {
    const response = associationFor(' ABCDE12345 ')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({
        applinks: {
            details: [{
                appIDs: ['ABCDE12345.app.progrezzia.mobile'],
                components: [
                    { '/': '/auth/invitation' },
                    { '/': '/auth/confirm' },
                    { '/': '/reset-password' },
                    { '/': '/notifications/open' },
                ],
            }],
        },
    })
})

test('responde sin redirección ni caché si falta el prefijo o es inválido', () => {
    for (const response of [associationFor(), associationFor('abc-example')]) {
        expect(response.status).toBe(404)
        expect(response.headers.get('location')).toBeNull()
        expect(response.headers.get('cache-control')).toBe('no-store')
    }
})
