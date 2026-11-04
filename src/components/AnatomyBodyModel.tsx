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
            defaultFill="#3f3f46"
            defaultStroke="#18181b"
            defaultStrokeWidth={0.8}
            border="#71717a"
        />
    )
}
