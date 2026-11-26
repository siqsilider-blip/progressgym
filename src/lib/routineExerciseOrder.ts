type RoutineBlock = 'activation' | 'main' | 'closing'

const BLOCK_ORDER: Record<RoutineBlock, number> = {
    activation: 0,
    main: 1,
    closing: 2,
}

type PositionedExercise = {
    block: string | null
    position: number | null
}

export function normalizeRoutineBlock(block: string | null): RoutineBlock {
    return block === 'activation' || block === 'closing' ? block : 'main'
}

export function compareRoutineExerciseOrder(left: PositionedExercise, right: PositionedExercise) {
    const blockDifference = BLOCK_ORDER[normalizeRoutineBlock(left.block)] - BLOCK_ORDER[normalizeRoutineBlock(right.block)]
    if (blockDifference !== 0) return blockDifference
    return (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER)
}

export function getRoutineExerciseSetCount(configuredSets: number | null, highestRecordedSetIndex = -1) {
    return Math.max(1, Number(configuredSets ?? 1), highestRecordedSetIndex + 1)
}
