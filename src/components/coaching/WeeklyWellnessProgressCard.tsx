'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type WeeklyWellnessPoint = {
    week_start: string
    energy: number
    sleep_quality: number
    stress: number
    training_difficulty: number
    body_weight: number | null
    waist_cm: number | null
}

export default function WeeklyWellnessProgressCard({ data }: { data: WeeklyWellnessPoint[] }) {
    const [measure, setMeasure] = useState<'body_weight' | 'waist_cm'>('body_weight')
    const latest = data[data.length - 1]
    const previous = data[data.length - 2]
    const measureData = useMemo(
        () => data.filter((point) => point[measure] != null),
        [data, measure]
    )

    if (!latest) {
        return (
            <section className="mb-4 rounded-2xl border border-dashed border-indigo-500/25 bg-indigo-500/[0.04] p-4">
                <p className="text-sm font-bold text-foreground">Seguimiento semanal</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Completá tu primer control para ver acá cómo evolucionan tu energía, descanso y medidas.</p>
                <Link href="/app/check-in" className="mt-3 inline-flex min-h-9 items-center rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white">Completar control</Link>
            </section>
        )
    }

    const selectedValue = latest[measure]
    const firstMeasured = measureData[0]?.[measure] ?? null
    const delta = selectedValue != null && firstMeasured != null ? selectedValue - firstMeasured : null

    return (
        <section className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
                <div>
                    <p className="text-sm font-bold text-foreground">Tu estado semanal</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Último control: {formatWeek(latest.week_start)}</p>
                </div>
                <Link href="/app/check-in" className="shrink-0 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1.5 text-[10px] font-bold text-indigo-500">Actualizar</Link>
            </div>

            <div className="grid grid-cols-4 gap-px border-y border-border bg-border">
                <WellnessScore label="Energía" value={latest.energy} previous={previous?.energy} />
                <WellnessScore label="Sueño" value={latest.sleep_quality} previous={previous?.sleep_quality} />
                <WellnessScore label="Estrés" value={latest.stress} previous={previous?.stress} inverse />
                <WellnessScore label="Exigencia" value={latest.training_difficulty} previous={previous?.training_difficulty} inverse />
            </div>

            <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex rounded-xl bg-muted/50 p-1">
                        <MeasureTab active={measure === 'body_weight'} onClick={() => setMeasure('body_weight')}>Peso</MeasureTab>
                        <MeasureTab active={measure === 'waist_cm'} onClick={() => setMeasure('waist_cm')}>Cintura</MeasureTab>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-foreground">{selectedValue != null ? `${formatNumber(selectedValue)} ${measure === 'body_weight' ? 'kg' : 'cm'}` : 'Sin datos'}</p>
                        {delta != null && measureData.length > 1 && (
                            <p className={`text-[10px] font-semibold ${delta <= 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>{delta > 0 ? '+' : ''}{formatNumber(delta)} desde el primer registro</p>
                        )}
                    </div>
                </div>

                {measureData.length >= 2 ? (
                    <div className="mt-3 h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={measureData} margin={{ top: 5, right: 6, left: -26, bottom: 0 }}>
                                <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                                <XAxis dataKey="week_start" tickFormatter={formatShortDate} tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis domain={['auto', 'auto']} tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} tickCount={3} />
                                <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: 10, fontSize: 11 }} labelFormatter={(label) => formatWeek(String(label))} formatter={(value) => [`${formatNumber(Number(value))} ${measure === 'body_weight' ? 'kg' : 'cm'}`, measure === 'body_weight' ? 'Peso' : 'Cintura']} />
                                <Line type="monotone" dataKey={measure} stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="mt-3 rounded-xl bg-muted/35 px-3 py-3 text-[11px] leading-4 text-muted-foreground">
                        {measureData.length === 1 ? 'Con un segundo registro vas a empezar a ver la evolución.' : 'Este dato es opcional. Podés cargarlo en el próximo control semanal.'}
                    </div>
                )}
            </div>
        </section>
    )
}

function WellnessScore({ label, value, previous, inverse = false }: { label: string; value: number; previous?: number; inverse?: boolean }) {
    const isGood = inverse ? value <= 2 : value >= 4
    const isWarning = inverse ? value >= 4 : value <= 2
    const change = previous == null ? 0 : value - previous
    const helpfulChange = inverse ? change < 0 : change > 0

    return (
        <div className="bg-card px-1.5 py-3 text-center">
            <p className={`text-base font-black ${isWarning ? 'text-amber-500' : isGood ? 'text-emerald-500' : 'text-foreground'}`}>{value}/5</p>
            <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{label}</p>
            {change !== 0 && <p className={`mt-0.5 text-[8px] font-bold ${helpfulChange ? 'text-emerald-500' : 'text-amber-500'}`}>{change > 0 ? '↑' : '↓'} vs. anterior</p>}
        </div>
    )
}

function MeasureTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>{children}</button>
}

function formatWeek(value: string) {
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function formatShortDate(value: string) {
    const [, month, day] = value.split('-')
    return `${day}/${month}`
}

function formatNumber(value: number) {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value)
}
