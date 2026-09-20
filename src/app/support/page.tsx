import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, ShieldCheck, UserRoundX } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/lib/public-config'

export const metadata: Metadata = {
    title: 'Soporte | Progrezzia',
    description: 'Ayuda y contacto de Progrezzia.',
}

export default function SupportPage() {
    return (
        <main className="min-h-screen bg-[#07070a] px-4 py-8 text-zinc-100 sm:py-12">
            <div className="mx-auto max-w-xl">
                <Link href="/" className="text-sm font-semibold text-violet-400 hover:text-violet-300">← Progrezzia</Link>
                <h1 className="mt-8 text-3xl font-black tracking-tight">Soporte</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400">Si algo no funciona o necesitás ayuda con tu cuenta, escribinos. Respondemos en español.</p>

                <div className="mt-8 space-y-3">
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=Soporte%20Progrezzia`} className="flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 hover:bg-violet-500/15">
                        <Mail className="h-5 w-5 text-violet-400" />
                        <div><p className="text-sm font-bold">Contactar soporte</p><p className="text-xs text-zinc-400">{SUPPORT_EMAIL}</p></div>
                    </a>
                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
                        <div><p className="text-sm font-bold">Problemas para ingresar</p><p className="mt-1 text-xs leading-5 text-zinc-400">Usá “Olvidé mi contraseña” en la pantalla de acceso. Los alumnos deben ingresar con el correo al que recibieron su invitación.</p></div>
                    </div>
                    <Link href="/account-deletion" className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05]">
                        <UserRoundX className="mt-0.5 h-5 w-5 text-red-400" />
                        <div><p className="text-sm font-bold">Eliminar mi cuenta</p><p className="mt-1 text-xs leading-5 text-zinc-400">Consultá qué se elimina y cómo iniciar el proceso desde la app.</p></div>
                    </Link>
                </div>

                <div className="mt-8 flex gap-5 border-t border-white/10 pt-6 text-xs text-zinc-500">
                    <Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link>
                </div>
            </div>
        </main>
    )
}
