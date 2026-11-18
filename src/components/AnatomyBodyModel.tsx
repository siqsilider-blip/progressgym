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
            defaultFill="#24262b"
            defaultStroke="#111216"
            defaultStrokeWidth={1.1}
            border="#8b8f99"
        />
    )
}
