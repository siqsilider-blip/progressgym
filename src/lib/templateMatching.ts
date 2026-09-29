import {
    ONBOARDING_EQUIPMENT,
    ONBOARDING_EXPERIENCE,
    ONBOARDING_GOALS,
    ONBOARDING_LOCATIONS,
    type StudentOnboardingProfile,
} from '@/lib/studentOnboarding'

export const TEMPLATE_GOALS = ONBOARDING_GOALS
export const TEMPLATE_EXPERIENCE = ONBOARDING_EXPERIENCE
export const TEMPLATE_LOCATIONS = ONBOARDING_LOCATIONS
export const TEMPLATE_EQUIPMENT = ONBOARDING_EQUIPMENT

export type TemplateMatchingProfile = {
    target_goals: string[]
    target_experience_levels: string[]
    target_locations: string[]
    required_equipment: string[]
    target_session_minutes: number | null
}

export type TemplateForMatching = TemplateMatchingProfile & {
    daysPerWeek: number
}

export type TemplateMatch = {
    score: number
    isClassified: boolean
    isStrongMatch: boolean
    reasons: string[]
    warnings: string[]
}

export function getTemplateMatch(
    template: TemplateForMatching,
    student: StudentOnboardingProfile | null,
): TemplateMatch {
    if (!student?.completed_at) {
        return { score: 0, isClassified: hasMatchingCriteria(template), isStrongMatch: false, reasons: [], warnings: [] }
    }

    let score = 0
    const reasons: string[] = []
    const warnings: string[] = []

    if (template.daysPerWeek === student.training_days_per_week) {
        score += 40
        reasons.push(`${template.daysPerWeek} días`)
    } else {
        warnings.push(`${template.daysPerWeek} días vs. ${student.training_days_per_week} disponibles`)
    }

    if (template.target_goals.length > 0) {
        const matchingGoals = template.target_goals.filter((goal) => student.goals.includes(goal))
        if (matchingGoals.length > 0) {
            score += 30
            reasons.push(...matchingGoals.slice(0, 2).map((goal) => TEMPLATE_GOALS[goal as keyof typeof TEMPLATE_GOALS] ?? goal))
        } else {
            warnings.push('Objetivo distinto')
        }
    }

    if (template.target_experience_levels.length > 0) {
        if (template.target_experience_levels.includes(student.experience_level)) {
            score += 15
            reasons.push(TEMPLATE_EXPERIENCE[student.experience_level as keyof typeof TEMPLATE_EXPERIENCE] ?? student.experience_level)
        } else {
            warnings.push('Nivel distinto')
        }
    }

    if (template.target_locations.length > 0) {
        const locationMatches = student.training_location === 'both'
            || template.target_locations.includes('both')
            || template.target_locations.includes(student.training_location)
        if (locationMatches) {
            score += 10
            reasons.push(TEMPLATE_LOCATIONS[student.training_location as keyof typeof TEMPLATE_LOCATIONS] ?? student.training_location)
        } else {
            warnings.push('Lugar no compatible')
        }
    }

    if (template.required_equipment.length > 0) {
        const missingEquipment = template.required_equipment.filter((item) => !student.available_equipment.includes(item))
        if (missingEquipment.length === 0) {
            score += 10
            reasons.push('Equipamiento disponible')
        } else {
            warnings.push(`Falta ${missingEquipment.map((item) => TEMPLATE_EQUIPMENT[item as keyof typeof TEMPLATE_EQUIPMENT] ?? item).join(', ')}`)
            score -= 30
        }
    }

    if (template.target_session_minutes) {
        if (template.target_session_minutes <= student.session_minutes) {
            score += 5
            reasons.push(`${template.target_session_minutes} min`)
        } else {
            warnings.push(`Requiere ${template.target_session_minutes} min`)
        }
    }

    const isClassified = hasMatchingCriteria(template)
    return {
        score,
        isClassified,
        isStrongMatch: isClassified && score >= 70 && warnings.length === 0,
        reasons,
        warnings,
    }
}

export function hasMatchingCriteria(template: TemplateForMatching) {
    return template.target_goals.length > 0
        || template.target_experience_levels.length > 0
        || template.target_locations.length > 0
        || template.required_equipment.length > 0
        || template.target_session_minutes !== null
}

export function normalizeStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
