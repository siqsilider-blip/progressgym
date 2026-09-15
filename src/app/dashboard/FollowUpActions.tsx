'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock3, MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import type { TrainerAlert } from './getTrainerAlerts'
import { recordStudentFollowUp } from './followUpServerActions'

function getFollowUpMessage(alert: TrainerAlert) {
    const firstName = alert.studentName.split(' ')[0] || '¿cómo estás?'

    switch (alert.type) {
        case 'inactive':
            return `Hola ${firstName}, ¿cómo estás? Vi que esta semana no pudiste entrenar. ¿Hubo algo que te haya complicado? Si querés, ajustamos el plan para que puedas retomarlo.`
        case 'unfinished_session':
            return `Hola ${firstName}, ¿cómo estás? Vi que quedó una sesión de entrenamiento abierta. ¿Pudiste terminarla o tuviste algún problema con la app?`
        case 'program_ending':
            return `Hola ${firstName}, ya estás entrando en la última semana del programa. ¿Cómo te sentiste con este bloque? Voy revisando el próximo para que sigamos avanzando.`
        case 'new_student':
            return `Hola ${firstName}, ¿cómo estás? Ya tenés tu programa disponible. Si necesitás ayuda para empezar o te surge alguna duda, escribime.`
        case 'no_routine':
            return `Hola ${firstName}, ¿cómo estás? Estoy organizando tu programa de entrenamiento. Te aviso apenas quede listo para que podamos empezar.`
    }
}

export default function FollowUpActions({ alert }: { alert: TrainerAlert }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const whatsappUrl = alert.studentPhone
        ? buildWhatsAppUrl(alert.studentPhone, getFollowUpMessage(alert))
        : null

    function recordAction(action: 'whatsapp_opened' | 'snoozed') {
        if (isPending) return
        setError('')
        startTransition(async () => {
            const result = await recordStudentFollowUp({
                studentId: alert.studentId,
                alertType: alert.type,
                action,
            })
            if (!result.ok) {
                setError(result.error ?? 'No se pudo registrar.')
                return
            }
            router.refresh()
        })
    }

    return (
        <div className="flex shrink-0 flex-col items-end gap-2">
            <Link
                href={alert.actionHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-500 transition hover:text-indigo-400"
            >
                Resolver
                <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            {whatsappUrl ? (
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordAction('whatsapp_opened')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 transition hover:text-emerald-400"
                >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                </a>
            ) : (
                <Link
                    href={`/dashboard/students/${alert.studentId}`}
                    className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                >
                    Agregar teléfono
                </Link>
            )}

            <button
                type="button"
                disabled={isPending}
                onClick={() => recordAction('snoozed')}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
            >
                <Clock3 className="h-3.5 w-3.5" />
                {isPending ? 'Guardando...' : 'Posponer 3 días'}
            </button>

            {error && <span className="max-w-32 text-right text-[10px] text-red-400">{error}</span>}
        </div>
    )
}
