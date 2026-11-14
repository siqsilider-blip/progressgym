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

export const TRAINING_WEEKDAYS = [
    { value: 1, shortLabel: 'Lun', label: 'Lunes' },
    { value: 2, shortLabel: 'Mar', label: 'Martes' },
    { value: 3, shortLabel: 'Mié', label: 'Miércoles' },
    { value: 4, shortLabel: 'Jue', label: 'Jueves' },
    { value: 5, shortLabel: 'Vie', label: 'Viernes' },
    { value: 6, shortLabel: 'Sáb', label: 'Sábado' },
    { value: 7, shortLabel: 'Dom', label: 'Domingo' },
] as const

export type TrainingWeekday = (typeof TRAINING_WEEKDAYS)[number]['value']

export type StudentOnboardingProfile = {
    student_id: string
    goals: string[]
    experience_level: string
    training_days_per_week: number
    preferred_training_weekdays: number[] | null
    session_minutes: number
    training_location: string
    available_equipment: string[]
    limitations: string | null
    preferences: string | null
    completed_at: string
}
