import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

const TECHNIQUE_VIDEO_BUCKET = 'technique-videos'
const CLEANUP_BATCH_SIZE = 100

type ClaimedTechniqueVideo = {
    submission_id: string
    storage_path: string
}

export type TechniqueVideoCleanupSummary = {
    claimed: number
    completed: number
    retrying: number
}

function firstRows(data: unknown): ClaimedTechniqueVideo[] {
    if (!Array.isArray(data)) return []
    return data.filter((row): row is ClaimedTechniqueVideo => {
        if (!row || typeof row !== 'object') return false
        const value = row as Record<string, unknown>
        return typeof value.submission_id === 'string'
            && typeof value.storage_path === 'string'
    })
}

/**
 * Claims expired rows in Postgres, removes each private Storage object and
 * only then removes its metadata. Failed items are released for a later retry.
 */
export async function cleanupExpiredTechniqueVideos(
    limit = CLEANUP_BATCH_SIZE
): Promise<TechniqueVideoCleanupSummary> {
    const admin = createAdminClient()
    const safeLimit = Math.max(1, Math.min(limit, CLEANUP_BATCH_SIZE))
    const summary: TechniqueVideoCleanupSummary = {
        claimed: 0,
        completed: 0,
        retrying: 0,
    }

    const { data, error } = await admin.rpc('claim_expired_technique_videos', {
        p_limit: safeLimit,
    })
    if (error) {
        // A deployment can briefly precede its database migration. Account
        // deletion must keep running during that small rollout window.
        if (error.code === 'PGRST202' || error.code === '42883') return summary
        throw new Error('technique_video_cleanup_claim_failed')
    }

    const claimed = firstRows(data)
    summary.claimed = claimed.length

    for (const item of claimed) {
        try {
            const { error: storageError } = await admin.storage
                .from(TECHNIQUE_VIDEO_BUCKET)
                .remove([item.storage_path])
            if (storageError) throw new Error('storage_delete_failed')

            const { data: finalized, error: finalizeError } = await admin.rpc(
                'finalize_technique_video_cleanup',
                { p_submission_id: item.submission_id }
            )
            if (finalizeError || finalized !== true) {
                throw new Error('metadata_delete_failed')
            }
            summary.completed += 1
        } catch (cleanupError) {
            summary.retrying += 1
            console.error('[technique-video-cleanup] item failed', {
                submissionId: item.submission_id,
                code: cleanupError instanceof Error
                    ? cleanupError.message
                    : 'unexpected_error',
            })
            const { error: releaseError } = await admin.rpc(
                'release_technique_video_cleanup',
                { p_submission_id: item.submission_id }
            )
            if (releaseError) {
                console.error('[technique-video-cleanup] release failed', {
                    submissionId: item.submission_id,
                })
            }
        }
    }

    return summary
}
