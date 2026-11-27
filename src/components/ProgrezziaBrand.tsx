import Image from 'next/image'

export function ProgrezziaMark({ size }: { size: number }) {
    return (
        <Image
            src="/brand/progrezzia-emblem.webp"
            alt=""
            width={size}
            height={size}
            className="shrink-0 object-contain"
            unoptimized
        />
    )
}

export function ProgrezziaLogo() {
    return (
        <Image
            src="/brand/progrezzia-logo.webp"
            alt="Progrezzia"
            width={190}
            height={204}
            className="mx-auto h-auto max-w-full"
            priority
        />
    )
}
