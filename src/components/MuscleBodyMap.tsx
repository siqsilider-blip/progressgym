'use client'

import dynamic from 'next/dynamic'
import type { ExtendedBodyPart, Slug } from 'react-muscle-highlighter'
import type { AnatomyBodyModelProps } from '@/components/AnatomyBodyModel'
import { MUSCLE_CATALOG, muscleLabel, type MuscleId, type MuscleView } from '@/lib/exerciseMuscles'

const AnatomyBodyModel = dynamic<AnatomyBodyModelProps>(
    () => import('@/components/AnatomyBodyModel'),
    {
        ssr: false,
        loading: () => <div className="h-[18rem] w-[9rem] animate-pulse rounded-full bg-white/[0.03]" aria-hidden="true" />,
    }
)

type Props = {
    primary: MuscleId[]
    secondary: MuscleId[]
    className?: string
}

const BODY_PARTS: Record<MuscleId, Slug[]> = {
    chest: ['chest'],
    upper_back: ['trapezius', 'upper-back'],
    lats: ['upper-back'],
    shoulders: ['deltoids'],
    biceps: ['biceps'],
    triceps: ['triceps'],
    forearms: ['forearm'],
    core: ['abs', 'obliques'],
    lower_back: ['lower-back'],
    glutes: ['gluteal'],
    quadriceps: ['quadriceps'],
    hamstrings: ['hamstring'],
    adductors: ['adductors'],
    calves: ['calves'],
    // El modelo no separa los flexores de cadera. Cuádriceps y aductores
    // ofrecen la referencia visual más cercana, mientras el texto conserva
    // el nombre anatómico correcto.
    hip_flexors: ['quadriceps', 'adductors'],
}

function buildBodyData(primary: MuscleId[], secondary: MuscleId[]): ExtendedBodyPart[] {
    const parts = new Map<Slug, ExtendedBodyPart>()

    for (const muscle of secondary) {
        for (const slug of BODY_PARTS[muscle]) {
            parts.set(slug, {
                slug,
                color: 'rgba(217, 217, 217, 0.65)',
                styles: { fill: 'rgba(217, 217, 217, 0.65)', stroke: '#111111', strokeWidth: 1.5 },
            })
        }
    }

    for (const muscle of primary) {
        for (const slug of BODY_PARTS[muscle]) {
            parts.set(slug, {
                slug,
                color: '#c98796',
                styles: { fill: '#c98796', stroke: '#111111', strokeWidth: 2.2 },
            })
        }
    }

    return [...parts.values()]
}

function viewLabel(view: MuscleView) {
    return view === 'front' ? 'Frente' : 'Espalda'
}

export default function MuscleBodyMap({ primary, secondary, className = '' }: Props) {
    const bodyData = buildBodyData(primary, secondary)
    const musclesForView = primary.length > 0 ? primary : secondary
    const activeViews = new Set(musclesForView.map((muscle) => MUSCLE_CATALOG[muscle].view))
    const views: MuscleView[] = activeViews.size === 0
        ? ['front', 'back']
        : (['front', 'back'] as MuscleView[]).filter((view) => activeViews.has(view))
    const scale = views.length === 1 ? 0.75 : 0.57
    const primaryLabels = primary.map(muscleLabel).join(', ') || 'sin clasificar'
    const secondaryLabels = secondary.map(muscleLabel).join(', ')

    return (
        <div
            role="img"
            aria-label={`Mapa corporal anatómico. Principal: ${primaryLabels}.${secondaryLabels ? ` También participan: ${secondaryLabels}.` : ''}`}
            className={`flex w-full items-end justify-center gap-4 overflow-hidden [&_svg]:pointer-events-none ${className}`}
        >
            {views.map((view) => (
                <div key={view} className="flex min-w-0 flex-col items-center">
                    <div className="rounded-2xl bg-gradient-to-b from-primary/[0.06] to-transparent px-2 pt-2">
                        <AnatomyBodyModel
                            data={bodyData}
                            view={view}
                            scale={scale}
                        />
                    </div>
                    <span className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {viewLabel(view)}
                    </span>
                </div>
            ))}
        </div>
    )
}
