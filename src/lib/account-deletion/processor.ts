import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

const PHOTO_BUCKET = 'progress-photos'
const PROCESSING_LIMIT = 10
const STORAGE_BATCH_SIZE = 1000

type AccountRole = 'student' | 'trainer'

type ClaimedDeletion = {
    request_id: string
    subject_user_id: string
    account_role: AccountRole
    subject_student_id: string | null
    lease_token: string
    storage_deleted_at: string | null
    public_data_deleted_at: string | null
    auth_delete_started_at: string | null
    attempt_count: number
}

type ProcessorSummary = {
    claimed: number
    completed: number
    blocked: number
    retrying: number
}

class AccountDeletionError extends Error {
    constructor(readonly code: string) {
        super(code)
    }
}

function firstRow<T>(data: unknown): T | null {
    if (Array.isArray(data)) return (data[0] as T | undefined) ?? null
    return data && typeof data === 'object' ? data as T : null
}

function errorCode(error: unknown, fallback: string) {
    return error instanceof AccountDeletionError ? error.code : fallback
}

function blockedReason(value: unknown): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const blocked = (value as Record<string, unknown>).blocked
    return typeof blocked === 'string' && blocked.length > 0 ? blocked : null
}

function isMissingAuthUserError(error: { message?: string; status?: number } | null) {
    if (!error) return false
    return error.status === 404 || /user.*not found|not found.*user/i.test(error.message ?? '')
}

type RpcCaller = (
    name: string,
    params?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: { message: string } | null }>

async function requireRpcSuccess(
    rpc: RpcCaller,
    name: string,
    params: Record<string, unknown>,
    failureCode: string
) {
    const { data, error } = await rpc(name, params)
    if (error || data !== true) throw new AccountDeletionError(failureCode)
}

async function deleteStudentPhotoStorage(
    admin: ReturnType<typeof createAdminClient>,
    request: ClaimedDeletion
) {
    if (request.account_role !== 'student') return 0
    if (!request.subject_student_id) throw new AccountDeletionError('missing_student_link')

    const prefix = `${request.subject_user_id}/`
    const { data: photoRows, error: photoRowsError } = await admin
        .from('student_progress_photos')
        .select('storage_path')
        .eq('student_id', request.subject_student_id)

    if (photoRowsError) throw new AccountDeletionError('storage_metadata_read_failed')

    const registeredPaths = new Set<string>()
    for (const row of photoRows ?? []) {
        const path = typeof row.storage_path === 'string' ? row.storage_path : ''
        if (!path.startsWith(prefix)) {
            throw new AccountDeletionError('storage_path_integrity_error')
        }
        registeredPaths.add(path)
    }

    let deletedCount = 0
    const removePaths = async (paths: string[]) => {
        for (let index = 0; index < paths.length; index += STORAGE_BATCH_SIZE) {
            const batch = paths.slice(index, index + STORAGE_BATCH_SIZE)
            if (batch.length === 0) continue
            const { data, error } = await admin.storage.from(PHOTO_BUCKET).remove(batch)
            if (error) throw new AccountDeletionError('storage_delete_failed')
            deletedCount += data?.length ?? batch.length
        }
    }

    await removePaths([...registeredPaths])

    // También elimina archivos huérfanos que existan físicamente pero hayan
    // perdido su fila. Los uploads viven bajo <auth_user_id>/<uuid>.jpg.
    for (let page = 0; page < 100; page += 1) {
        const { data, error } = await admin.storage
            .from(PHOTO_BUCKET)
            .list(request.subject_user_id, {
                limit: STORAGE_BATCH_SIZE,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
            })

        if (error) throw new AccountDeletionError('storage_list_failed')
        const paths = (data ?? [])
            .filter((entry) => entry.id && entry.name)
            .map((entry) => `${request.subject_user_id}/${entry.name}`)

        if (paths.length === 0) return deletedCount
        await removePaths(paths)
    }

    throw new AccountDeletionError('storage_cleanup_limit_reached')
}

async function processClaim(request: ClaimedDeletion) {
    const admin = createAdminClient()
    const rpc = admin.rpc.bind(admin) as unknown as RpcCaller

    if (!request.public_data_deleted_at) {
        const { data, error } = await admin.rpc('preflight_account_deletion', {
            p_request_id: request.request_id,
            p_lease_token: request.lease_token,
        })
        if (error) throw new AccountDeletionError('preflight_failed')

        const reason = blockedReason(data)
        if (reason) {
            await requireRpcSuccess(rpc, 'block_account_deletion', {
                p_request_id: request.request_id,
                p_lease_token: request.lease_token,
                p_reason: reason,
            }, 'block_checkpoint_failed')
            return 'blocked' as const
        }
    }

    if (!request.storage_deleted_at) {
        const deletedCount = await deleteStudentPhotoStorage(admin, request)
        await requireRpcSuccess(rpc, 'mark_account_deletion_storage_deleted', {
            p_request_id: request.request_id,
            p_lease_token: request.lease_token,
            p_deleted_count: deletedCount,
        }, 'storage_checkpoint_failed')
    }

    if (!request.public_data_deleted_at) {
        const { data, error } = await admin.rpc('purge_account_public_data', {
            p_request_id: request.request_id,
            p_lease_token: request.lease_token,
        })

        if (error) throw new AccountDeletionError('database_purge_failed')
        const reason = blockedReason(data)
        if (reason) {
            await requireRpcSuccess(rpc, 'block_account_deletion', {
                p_request_id: request.request_id,
                p_lease_token: request.lease_token,
                p_reason: reason,
            }, 'block_checkpoint_failed')
            return 'blocked' as const
        }
    }

    // Se repite antes de CADA intento de Auth, incluso en reintentos que ya
    // tengan auth_delete_started_at. Así un objeto tardío nunca deja la cuenta
    // atascada permanentemente.
    const finalStorageDeletedCount = await deleteStudentPhotoStorage(admin, request)
    await requireRpcSuccess(rpc, 'mark_account_deletion_storage_deleted', {
        p_request_id: request.request_id,
        p_lease_token: request.lease_token,
        p_deleted_count: finalStorageDeletedCount,
    }, 'final_storage_checkpoint_failed')

    if (!request.auth_delete_started_at) {
        await requireRpcSuccess(rpc, 'mark_account_deletion_auth_started', {
            p_request_id: request.request_id,
            p_lease_token: request.lease_token,
        }, 'auth_checkpoint_failed')
    }

    const { error: authError } = await admin.auth.admin.deleteUser(
        request.subject_user_id,
        false
    )
    if (authError && !isMissingAuthUserError(authError)) {
        throw new AccountDeletionError('auth_delete_failed')
    }

    await requireRpcSuccess(rpc, 'complete_account_deletion', {
        p_request_id: request.request_id,
        p_lease_token: request.lease_token,
    }, 'completion_checkpoint_failed')

    return 'completed' as const
}

export async function processDueAccountDeletions(
    limit = PROCESSING_LIMIT
): Promise<ProcessorSummary> {
    const summary: ProcessorSummary = {
        claimed: 0,
        completed: 0,
        blocked: 0,
        retrying: 0,
    }
    const safeLimit = Math.max(1, Math.min(limit, PROCESSING_LIMIT))

    for (let index = 0; index < safeLimit; index += 1) {
        const admin = createAdminClient()
        const { data, error } = await admin.rpc('claim_due_account_deletion')
        if (error) throw new AccountDeletionError('claim_failed')

        const request = firstRow<ClaimedDeletion>(data)
        if (!request) break
        summary.claimed += 1

        try {
            const outcome = await processClaim(request)
            summary[outcome] += 1
        } catch (error) {
            const code = errorCode(error, 'unexpected_error')
            console.error('[account-deletion] processing failed', {
                requestId: request.request_id,
                code,
            })

            const { data: retryData, error: retryError } = await admin.rpc(
                'retry_account_deletion',
                {
                    p_request_id: request.request_id,
                    p_lease_token: request.lease_token,
                    p_error_code: code,
                }
            )
            if (retryError || retryData !== true) {
                console.error('[account-deletion] could not schedule retry', {
                    requestId: request.request_id,
                })
            }
            summary.retrying += 1
        }
    }

    return summary
}
