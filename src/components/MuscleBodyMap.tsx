import * as React from 'react'
import { MUSCLE_CATALOG, muscleLabel, type MuscleId, type MuscleView } from '@/lib/exerciseMuscles'

type Props = {
    primary: MuscleId[]
    secondary: MuscleId[]
    className?: string
}

type ZoneProps = React.PropsWithChildren<{
    muscle: MuscleId
    primary: Set<MuscleId>
    secondary: Set<MuscleId>
}>

function Zone({ muscle, primary, secondary, children }: ZoneProps) {
    const isPrimary = primary.has(muscle)
    const isSecondary = secondary.has(muscle)
    if (!isPrimary && !isSecondary) return null

    return (
        <g
            fill={isPrimary ? '#7c3aed' : '#a78bfa'}
            stroke={isPrimary ? '#c4b5fd' : '#ddd6fe'}
            strokeWidth="1.25"
            opacity={isPrimary ? 1 : 0.78}
        >
            {children}
        </g>
    )
}

function BodyBase() {
    return (
        <g className="fill-current text-muted-foreground" opacity="0.16">
            <ellipse cx="80" cy="25" rx="17" ry="21" />
            <path d="M69 44h22l3 16c12 5 20 15 23 30l13 63-13 3-18-57-4 58-9 22-2 101H68l-3-101-9-22-4-58-18 57-13-3 13-63c3-15 11-25 23-30l3-16Z" />
        </g>
    )
}

function FrontFigure({ primary, secondary }: { primary: Set<MuscleId>; secondary: Set<MuscleId> }) {
    return (
        <svg viewBox="0 0 160 292" className="h-full w-full" aria-hidden="true" focusable="false">
            <BodyBase />
            <Zone muscle="shoulders" primary={primary} secondary={secondary}>
                <ellipse cx="52" cy="76" rx="12" ry="10" />
                <ellipse cx="108" cy="76" rx="12" ry="10" />
            </Zone>
            <Zone muscle="chest" primary={primary} secondary={secondary}>
                <path d="M61 72c5-4 12-5 18-2v31c-10 1-18-5-20-14Z" />
                <path d="M99 72c-5-4-12-5-18-2v31c10 1 18-5 20-14Z" />
            </Zone>
            <Zone muscle="biceps" primary={primary} secondary={secondary}>
                <ellipse cx="42" cy="108" rx="7" ry="17" />
                <ellipse cx="118" cy="108" rx="7" ry="17" />
            </Zone>
            <Zone muscle="forearms" primary={primary} secondary={secondary}>
                <path d="M33 127c5-1 9 1 11 5l-8 29-9-3Z" />
                <path d="M127 127c-5-1-9 1-11 5l8 29 9-3Z" />
            </Zone>
            <Zone muscle="core" primary={primary} secondary={secondary}>
                <path d="M66 104c9 3 19 3 28 0l2 45c-10 8-22 8-32 0Z" />
                <path d="M60 105c3 2 5 3 7 4l-4 38-8-13Z" opacity="0.72" />
                <path d="M100 105c-3 2-5 3-7 4l4 38 8-13Z" opacity="0.72" />
            </Zone>
            <Zone muscle="hip_flexors" primary={primary} secondary={secondary}>
                <path d="M64 151c7 4 10 5 15 5l-8 24-12-10Z" />
                <path d="M96 151c-7 4-10 5-15 5l8 24 12-10Z" />
            </Zone>
            <Zone muscle="adductors" primary={primary} secondary={secondary}>
                <path d="M72 169h7l-4 56-12-5Z" />
                <path d="M88 169h-7l4 56 12-5Z" />
            </Zone>
            <Zone muscle="quadriceps" primary={primary} secondary={secondary}>
                <path d="M58 169c7-4 12-3 17 2l-3 57-17-3Z" />
                <path d="M102 169c-7-4-12-3-17 2l3 57 17-3Z" />
            </Zone>
            <Zone muscle="calves" primary={primary} secondary={secondary}>
                <path d="M55 229c8 1 13 4 15 9l-3 38-14-1Z" />
                <path d="M105 229c-8 1-13 4-15 9l3 38 14-1Z" />
            </Zone>
        </svg>
    )
}

function BackFigure({ primary, secondary }: { primary: Set<MuscleId>; secondary: Set<MuscleId> }) {
    return (
        <svg viewBox="0 0 160 292" className="h-full w-full" aria-hidden="true" focusable="false">
            <BodyBase />
            <Zone muscle="shoulders" primary={primary} secondary={secondary}>
                <ellipse cx="52" cy="76" rx="12" ry="10" />
                <ellipse cx="108" cy="76" rx="12" ry="10" />
            </Zone>
            <Zone muscle="upper_back" primary={primary} secondary={secondary}>
                <path d="M61 68c12-7 26-7 38 0l-6 37-13 9-13-9Z" />
            </Zone>
            <Zone muscle="lats" primary={primary} secondary={secondary}>
                <path d="M59 88c6 5 12 8 19 9l-7 45-17-11Z" />
                <path d="M101 88c-6 5-12 8-19 9l7 45 17-11Z" />
            </Zone>
            <Zone muscle="triceps" primary={primary} secondary={secondary}>
                <ellipse cx="42" cy="108" rx="7" ry="18" />
                <ellipse cx="118" cy="108" rx="7" ry="18" />
            </Zone>
            <Zone muscle="forearms" primary={primary} secondary={secondary}>
                <path d="M33 127c5-1 9 1 11 5l-8 29-9-3Z" />
                <path d="M127 127c-5-1-9 1-11 5l8 29 9-3Z" />
            </Zone>
            <Zone muscle="lower_back" primary={primary} secondary={secondary}>
                <path d="M66 132c9 4 19 4 28 0l4 22c-12 7-24 7-36 0Z" />
            </Zone>
            <Zone muscle="glutes" primary={primary} secondary={secondary}>
                <ellipse cx="68" cy="166" rx="14" ry="15" />
                <ellipse cx="92" cy="166" rx="14" ry="15" />
            </Zone>
            <Zone muscle="hamstrings" primary={primary} secondary={secondary}>
                <path d="M57 181c7-5 14-4 20 1l-4 47-18-4Z" />
                <path d="M103 181c-7-5-14-4-20 1l4 47 18-4Z" />
            </Zone>
            <Zone muscle="calves" primary={primary} secondary={secondary}>
                <path d="M55 229c9 0 15 5 16 12l-5 35-13-1Z" />
                <path d="M105 229c-9 0-15 5-16 12l5 35 13-1Z" />
            </Zone>
        </svg>
    )
}

function viewLabel(view: MuscleView) {
    return view === 'front' ? 'Frente' : 'Espalda'
}

export default function MuscleBodyMap({ primary, secondary, className = '' }: Props) {
    const primarySet = new Set(primary)
    const secondarySet = new Set(secondary)
    const muscles = [...primary, ...secondary]
    const activeViews = new Set(muscles.map((muscle) => MUSCLE_CATALOG[muscle].view))
    const views: MuscleView[] = activeViews.size === 0
        ? ['front', 'back']
        : (['front', 'back'] as MuscleView[]).filter((view) => activeViews.has(view))
    const primaryLabels = primary.map(muscleLabel).join(', ') || 'sin clasificar'
    const secondaryLabels = secondary.map(muscleLabel).join(', ')

    return (
        <div
            role="img"
            aria-label={`Mapa corporal. Principal: ${primaryLabels}.${secondaryLabels ? ` También participan: ${secondaryLabels}.` : ''}`}
            className={`grid h-52 min-w-0 gap-1 ${views.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${className}`}
        >
            {views.map((view) => (
                <div key={view} className="flex min-w-0 flex-col items-center">
                    <div className="min-h-0 flex-1">
                        {view === 'front'
                            ? <FrontFigure primary={primarySet} secondary={secondarySet} />
                            : <BackFigure primary={primarySet} secondary={secondarySet} />}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {viewLabel(view)}
                    </span>
                </div>
            ))}
        </div>
    )
}
