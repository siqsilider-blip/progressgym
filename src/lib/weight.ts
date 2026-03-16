export type WeightUnit = 'kg' | 'lb'

export function convertWeightFromKg(weightKg: number, unit: WeightUnit) {
    if (unit === 'lb') {
        return Math.round(weightKg * 2.20462)
    }

    return weightKg
}

export function convertWeightToKg(weight: number, unit: WeightUnit) {
    if (unit === 'lb') {
        return Number((weight / 2.20462).toFixed(2))
    }

    return weight
}

export function formatWeight(weightKg: number, unit: WeightUnit) {
    return `${convertWeightFromKg(weightKg, unit)} ${unit}`
}

export function formatWeightValue(weightKg: number | null | undefined, unit: WeightUnit) {
    if (weightKg == null) return ''
    return String(convertWeightFromKg(weightKg, unit))
}