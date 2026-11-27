export function parseExerciseVideoUrl(value: string | null | undefined): URL | null {
    if (!value?.trim()) return null

    try {
        const url = new URL(value.trim())
        if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) return null
        return url
    } catch {
        return null
    }
}
