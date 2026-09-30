import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type ProgressPhotoRecord = {
    id: string
    storage_path: string
    captured_on: string
    pose: 'front' | 'side' | 'back'
    marketing_consent: boolean
}

export async function createProgressPhotoUrls(
    supabase: SupabaseServerClient,
    photos: ProgressPhotoRecord[],
    expiresIn = 3600
) {
    if (photos.length === 0) return []

    const { data, error } = await supabase.storage
        .from('progress-photos')
        .createSignedUrls(photos.map((photo) => photo.storage_path), expiresIn)

    if (error || !data) {
        console.error('Error creating progress photo URLs:', error)
        return []
    }

    const urlByPath = new Map(
        data
            .filter((item) => !item.error && item.path && item.signedUrl)
            .map((item) => [item.path as string, item.signedUrl])
    )

    return photos.flatMap((photo) => {
        const url = urlByPath.get(photo.storage_path)
        return url ? [{ ...photo, url }] : []
    })
}
