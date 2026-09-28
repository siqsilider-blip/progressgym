export const ONBOARDING_GOALS = {
    lose_fat: 'Bajar grasa',
    gain_muscle: 'Ganar músculo',
    gain_strength: 'Ganar fuerza',
    move_better: 'Moverme mejor',
    feel_better: 'Sentirme mejor',
} as const

export const ONBOARDING_EXPERIENCE = {
    beginner: 'Estoy empezando',
    intermediate: 'Ya entrené antes',
    advanced: 'Entreno hace tiempo',
} as const

export const ONBOARDING_LOCATIONS = {
    gym: 'Gimnasio',
    home: 'Casa',
    both: 'Ambos',
} as const

export const ONBOARDING_EQUIPMENT = {
    machines: 'Máquinas',
    free_weights: 'Pesas y mancuernas',
    bands: 'Bandas',
    bodyweight: 'Peso corporal',
    cardio: 'Cardio',
} as const

export type StudentOnboardingProfile = {
    student_id: string
    goals: string[]
    experience_level: string
    training_days_per_week: number
    session_minutes: number
    training_location: string
    available_equipment: string[]
    limitations: string | null
    preferences: string | null
    completed_at: string
}
