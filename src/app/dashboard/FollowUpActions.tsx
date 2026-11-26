'use client'

import { useId, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Clock3, Ellipsis, MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import type { TrainerAlert } from './getTrainerAlerts'
import { recordStudentFollowUp } from './followUpServerActions'

function getFollowUpMessage(alert: TrainerAlert) {
    const firstName = alert.studentName.split(' ')[0] || '¿cómo estás?'

    switch (alert.type) {
        case 'missing_checkin':
            return `Hola ${firstName}, ¿cómo estás? Cuando puedas completá el control semanal desde la app. Me ayuda a saber cómo venís y ajustar el entrenamiento si hace falta.`
        case 'progress_photo_due':
            return `Hola ${firstName}, cuando puedas actualizá tus fotos de progreso desde el control semanal. Tratá de usar una luz, distancia y postura parecidas a las anteriores para comparar mejor.`
        case 'weekly_checkin':
            return `Hola ${firstName}, vi tu control semanal y quería saber un poco más para ajustar el entrenamiento. ¿Cómo te estás sintiendo hoy?`
        case 'workout_pain':
            return `Hola ${firstName}, vi que informaste una molestia después de entrenar. No repitas el ejercicio que te provocó dolor hasta que lo revisemos. ¿Cómo te sentís ahora y dónde la notaste?`
        case 'inactive':
            return `Hola ${firstName}, ¿cómo estás? Vi que esta semana no pudiste entrenar. ¿Hubo algo que te haya complicado? Si querés, ajustamos el plan para que puedas retomarlo.`
        case 'unfinished_session':
            return `Hola ${firstName}, ¿cómo estás? Vi que quedó una sesión de entrenamiento abierta. ¿Pudiste terminarla o tuviste algún problema con la app?`
        case 'program_ending':
            return `Hola ${firstName}, ya estás entrando en la última semana del programa. ¿Cómo te sentiste con este bloque? Voy revisando el próximo para que sigamos avanzando.`
        case 'new_student':
            return `Hola ${firstName}, ¿cómo estás? Ya tenés tu programa disponible. Si necesitás ayuda para empezar o te surge alguna duda, escribime.`
        case 'no_routine':
            if (alert.stage === 'access_pending') {
                return `Hola ${firstName}, te reenvié el acceso a Progrezzia. Abrí el enlace para crear tu contraseña y completar tu ficha inicial.`
            }
            if (alert.stage === 'onboarding_pending') {
                return `Hola ${firstName}, cuando puedas completá la ficha inicial de Progrezzia. Con esos datos preparo el programa más adecuado para vos.`
            }
            return `Hola ${firstName}, recibí tu ficha inicial. Estoy preparando tu programa y te aviso apenas quede listo.`
    }
}

export default function FollowUpActions({ alert }: { alert: TrainerAlert }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const [showMore, setShowMore] = useState(false)
    const moreActionsId = useId()
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
        <div className="mt-2 flex flex-wrap items-center gap-1.5 lg:mt-0 lg:grid lg:grid-cols-[auto_auto] lg:justify-items-end lg:gap-1">
            <Link
                href={alert.actionHref}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-8 lg:border-transparent lg:bg-transparent lg:text-xs lg:text-brand-soft lg:hover:bg-accent"
            >
                {alert.actionLabel ?? 'Resolver'}
                <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
            </Link>
            <button
                type="button"
                aria-label={`Más acciones para ${alert.studentName}`}
                aria-expanded={showMore}
                aria-controls={moreActionsId}
                onClick={() => setShowMore((open) => !open)}
                className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:inline-flex"
            >
                <Ellipsis className="size-4" aria-hidden="true" />
            </button>

            <div id={moreActionsId} className={`flex flex-wrap items-center gap-1.5 lg:col-span-2 lg:justify-end ${showMore ? '' : 'lg:hidden'}`}>
                {whatsappUrl ? (
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordAction('whatsapp_opened')}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-800 transition hover:bg-emerald-500/15 lg:min-h-7 lg:text-xs dark:text-emerald-400"
                    >
                        <MessageCircle className="size-3" aria-hidden="true" />
                        WhatsApp
                    </a>
                ) : (
                    <Link
                        href={`/dashboard/students/${alert.studentId}`}
                        className="inline-flex items-center rounded-lg border border-border bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:text-foreground lg:min-h-7 lg:text-xs"
                    >
                        Agregar teléfono
                    </Link>
                )}

                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => recordAction('snoozed')}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50 lg:min-h-7 lg:text-xs"
                >
                    <Clock3 className="size-3" aria-hidden="true" />
                    {isPending ? 'Guardando...' : 'Después (3d)'}
                </button>
            </div>

            {error && <span role="alert" className="w-full text-[10px] text-destructive lg:col-span-2 lg:text-xs">{error}</span>}
        </div>
    )
}
