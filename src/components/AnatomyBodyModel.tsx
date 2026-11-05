'use client'

import Body, { type ExtendedBodyPart } from 'react-muscle-highlighter'
import type { MuscleView } from '@/lib/exerciseMuscles'

export type AnatomyBodyModelProps = {
    data: ReadonlyArray<ExtendedBodyPart>
    view: MuscleView
    scale: number
}

export default function AnatomyBodyModel({ data, view, scale }: AnatomyBodyModelProps) {
    return (
        <Body
            data={data}
            side={view}
            gender="female"
            scale={scale}
            defaultFill="var(--muted)"
            defaultStroke="var(--background)"
            defaultStrokeWidth={0.8}
            border="var(--muted-foreground)"
        />
    )
}
