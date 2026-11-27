import { NextResponse } from 'next/server'

const BUNDLE_ID = 'app.progrezzia.mobile'
const APP_ID_PREFIX = /^[A-Z0-9]{10}$/
const APP_LINK_PATHS = [
    '/auth/invitation',
    '/auth/confirm',
    '/reset-password',
    '/notifications/open',
]

export function GET() {
    const prefix = process.env.IOS_APP_LINK_APP_ID_PREFIX?.trim() ?? ''
    if (!APP_ID_PREFIX.test(prefix)) {
        return NextResponse.json({ error: 'Association unavailable' }, {
            status: 404,
            headers: { 'Cache-Control': 'no-store' },
        })
    }

    return NextResponse.json({
        applinks: {
            details: [{
                appIDs: [`${prefix}.${BUNDLE_ID}`],
                components: APP_LINK_PATHS.map((path) => ({ '/': path })),
            }],
        },
    }, {
        headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    })
}
