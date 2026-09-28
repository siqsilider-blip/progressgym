'use client'

import Link from 'next/link'
import { Activity, CalendarCheck, Check, MessageCircle, Ruler, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

type StudentMonthlySummaryCardProps = {
    studentId: string
    studentName: string
    studentPhone: string | null
    sessions: number
    previousSessions: number
    checkins: number
    weightChange: number | null
    waistChange: number | null
    painReports: number
}

export default function StudentMonthlySummaryCard({
    studentId,
    studentName,
    studentPhone,
    sessions,
    previousSessions,
    checkins,
    weightChange,
    waistChange,
    painReports,
}: StudentMonthlySummaryCardProps) {
    const [showSharePreview, setShowSharePreview] = useState(false)
    const [includeWeight, setIncludeWeight] = useState(false)
    const [includeWaist, setIncludeWaist] = useState(false)
    const sessionDelta = sessions - previousSessions
    const hasMeasurements = weightChange !== null || waistChange !== null
    const summaryMessage = buildSummaryMessage({
        studentName,
        sessions,
        checkins,
        weightChange: includeWeight ? weightChange : null,
        waistChange: includeWaist ? waistChange : null,
    })
    const whatsappUrl = studentPhone ? buildWhatsAppUrl(studentPhone, summaryMessage) : null

    return (
        <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Resumen de seguimiento</p>
                    <h2 className="mt-1 text-sm font-bold text-foreground">Últimos 28 días</h2>
                </div>
                <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${painReports > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {painReports > 0 ? `${painReports} alerta${painReports === 1 ? '' : 's'}` : 'Sin alertas'}
                </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
                <SummaryMetric
                    icon={<Activity className="h-4 w-4" />}
                    label="Entrenamientos"
                    value={String(sessions)}
                    detail={previousSessions > 0
                        ? `${sessionDelta >= 0 ? '+' : ''}${sessionDelta} vs. período anterior`
                        : 'Sin período anterior'}
                />
                <SummaryMetric
                    icon={<CalendarCheck className="h-4 w-4" />}
                    label="Controles enviados"
                    value={String(checkins)}
                    detail={checkins >= 4 ? 'Seguimiento al día' : 'Conviene reforzar el hábito'}
                />
                <SummaryMetric
                    icon={<Ruler className="h-4 w-4" />}
                    label="Peso"
                    value={formatChange(weightChange, 'kg')}
                    detail={weightChange === null ? 'Sin dos registros' : 'Cambio en el período'}
                />
                <SummaryMetric
                    icon={<Ruler className="h-4 w-4" />}
                    label="Cintura"
                    value={formatChange(waistChange, 'cm')}
                    detail={waistChange === null ? 'Sin dos registros' : 'Cambio en el período'}
                />
            </div>

            {!hasMeasurements && (
                <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Las variaciones aparecen cuando el alumno registra al menos dos mediciones dentro del período.</p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                <Link href={`/dashboard/students/${studentId}/history`} className="flex min-h-9 items-center justify-center rounded-xl border border-border bg-background text-[10px] font-bold text-foreground">
                    Ver historial
                </Link>
                {whatsappUrl ? (
                    <button type="button" onClick={() => setShowSharePreview((current) => !current)} className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-[10px] font-bold text-white">
                        <MessageCircle className="h-3.5 w-3.5" /> Preparar resumen
                    </button>
                ) : (
                    <Link href={`/dashboard/messages?student=${studentId}`} className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-[10px] font-bold text-white">
                        <MessageCircle className="h-3.5 w-3.5" /> Seguimiento
                    </Link>
                )}
            </div>

            {showSharePreview && whatsappUrl && (
                <div className="mt-3 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.05] p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Vista previa</p>
                            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Nada se envía automáticamente. Podés revisarlo y editarlo también en WhatsApp.</p>
                        </div>
                        <button type="button" onClick={() => setShowSharePreview(false)} aria-label="Cerrar vista previa" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {hasMeasurements && (
                        <div className="mt-3 space-y-2">
                            {weightChange !== null && (
                                <ShareOption checked={includeWeight} onChange={setIncludeWeight} label={`Incluir cambio de peso (${formatChange(weightChange, 'kg')})`} />
                            )}
                            {waistChange !== null && (
                                <ShareOption checked={includeWaist} onChange={setIncludeWaist} label={`Incluir cambio de cintura (${formatChange(waistChange, 'cm')})`} />
                            )}
                        </div>
                    )}

                    <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-[11px] leading-5 text-foreground">
                        {summaryMessage}
                    </div>

                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white">
                        <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
                    </a>
                </div>
            )}
        </section>
    )
}

function SummaryMetric({
    icon,
    label,
    value,
    detail,
}: {
    icon: ReactNode
    label: string
    value: string
    detail: string
}) {
    return (
        <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center gap-1.5 text-indigo-400">
                {icon}
                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-lg font-black text-foreground">{value}</p>
            <p className="mt-0.5 text-[9px] leading-3 text-muted-foreground">{detail}</p>
        </div>
    )
}

function formatChange(value: number | null, unit: string) {
    if (value === null) return '—'
    if (Math.abs(value) < 0.05) return `0 ${unit}`
    return `${value > 0 ? '+' : ''}${value.toFixed(1)} ${unit}`
}

function ShareOption({
    checked,
    onChange,
    label,
}: {
    checked: boolean
    onChange: (checked: boolean) => void
    label: string
}) {
    return (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-[10px] font-semibold text-foreground">
            <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-border'}`}>
                {checked && <Check className="h-3 w-3" />}
            </span>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
            {label}
        </label>
    )
}

function buildSummaryMessage({
    studentName,
    sessions,
    checkins,
    weightChange,
    waistChange,
}: {
    studentName: string
    sessions: number
    checkins: number
    weightChange: number | null
    waistChange: number | null
}) {
    const firstName = studentName.split(' ')[0] || '¿cómo estás?'
    const lines = [
        `Hola ${firstName}, te comparto tu resumen de los últimos 28 días:`,
        '',
        `• Entrenamientos completados: ${sessions}`,
        `• Controles semanales enviados: ${checkins}`,
    ]

    if (weightChange !== null) lines.push(`• Cambio de peso registrado: ${formatChange(weightChange, 'kg')}`)
    if (waistChange !== null) lines.push(`• Cambio de cintura registrado: ${formatChange(waistChange, 'cm')}`)

    lines.push(
        '',
        'Estos datos nos ayudan a revisar tu evolución y ajustar el próximo bloque. ¿Cómo te sentiste este mes?'
    )

    return lines.join('\n')
}
