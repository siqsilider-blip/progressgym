export type SettingsData = {
    name: string
    weight_unit: 'kg' | 'lb'
    theme: 'system' | 'dark' | 'light'
    display_name: string
    gym_name: string
    whatsapp: string
    default_sets: number
    default_reps: number
    default_rest: number
    show_prs: boolean
    show_charts: boolean
    notify_inactive: boolean
    notify_high_risk: boolean
}
