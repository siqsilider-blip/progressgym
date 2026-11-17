import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { processDueAccountDeletions } from '@/lib/account-deletion/processor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: Request) {
    const secret = process.env.CRON_SECRET
    const authorization = request.headers.get('authorization')
    if (!secret || !authorization) return false

    const expected = Buffer.from(`Bearer ${secret}`)
    const received = Buffer.from(authorization)
    return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false }, { status: 401 })
    }

    try {
        const summary = await processDueAccountDeletions()
        return NextResponse.json({ ok: true, ...summary })
    } catch (error) {
        console.error('[account-deletion] worker unavailable', {
            code: error instanceof Error ? error.message : 'unexpected_error',
        })
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}
