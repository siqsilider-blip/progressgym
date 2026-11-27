'use client'

import { useFormStatus } from 'react-dom'

export default function LoginButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="min-h-12 w-full rounded-full bg-[#c98796] px-4 font-bold text-[#111111] transition-colors hover:bg-[#e9a0ad] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e9a0ad] disabled:opacity-70"
        >
            {pending ? 'Ingresando…' : 'Entrar'}
        </button>
    )
}
