import { NextResponse } from 'next/server'

const ANDROID_PACKAGE_NAME = 'app.progrezzia.mobile'
const DEBUG_CERTIFICATE_SHA256 =
    '6D:32:55:F9:0A:3D:0F:3A:A4:1B:FC:0C:4F:87:50:97:BD:4A:7C:42:47:24:E4:84:39:10:4D:DA:F1:DC:35:5D'
const SHA256_FINGERPRINT = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/

function configuredCertificateFingerprints() {
    const productionFingerprints = (process.env.ANDROID_APP_LINK_SHA256_FINGERPRINTS ?? '')
        .split(',')
        .map((fingerprint) => fingerprint.trim().toUpperCase())
        .filter(Boolean)

    const fingerprints = Array.from(new Set([
        DEBUG_CERTIFICATE_SHA256,
        ...productionFingerprints,
    ]))

    const invalidFingerprint = fingerprints.find(
        (fingerprint) => !SHA256_FINGERPRINT.test(fingerprint)
    )

    if (invalidFingerprint) {
        throw new Error(
            'ANDROID_APP_LINK_SHA256_FINGERPRINTS contiene una huella SHA-256 inválida.'
        )
    }

    return fingerprints
}

export function GET() {
    return NextResponse.json(
        [
            {
                relation: ['delegate_permission/common.handle_all_urls'],
                target: {
                    namespace: 'android_app',
                    package_name: ANDROID_PACKAGE_NAME,
                    sha256_cert_fingerprints: configuredCertificateFingerprints(),
                },
            },
        ],
        {
            headers: {
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
        }
    )
}
