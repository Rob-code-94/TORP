import { logger } from 'firebase-functions/v2';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onDocumentCreated, onDocumentUpdated, } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { isProxyPath, parseProjectAssetPath } from '../storage/storagePaths.js';
async function writeAuditEntry(entry) {
    if (!entry.tenantId) {
        logger.warn('audit: refusing entry without tenantId', { type: entry.type });
        return;
    }
    try {
        const db = getFirestore();
        await db
            .collection('tenants')
            .doc(entry.tenantId)
            .collection('auditLog')
            .add({
            ...entry,
            at: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        logger.error('audit: write failed', {
            type: entry.type,
            tenantId: entry.tenantId,
            err: err?.message,
        });
    }
}
/**
 * Fires whenever Cloud Functions writes a new doc to
 * `storageDeliveryLinks/{linkId}` (i.e. an admin/PM issued a signed URL).
 * Mirrors the relevant fields into the tenant audit log.
 */
export const onStorageDeliveryLinkCreated = onDocumentCreated({
    document: 'storageDeliveryLinks/{linkId}',
    region: 'us-central1',
}, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const tenantId = data.tenantId || '';
    if (!tenantId)
        return;
    await writeAuditEntry({
        type: 'storage.deliveryLink.issued',
        tenantId,
        linkId: event.params.linkId,
        path: data.path ?? null,
        assetId: data.assetId ?? null,
        versionId: data.versionId ?? null,
        expiresAt: data.expiresAt ?? null,
        issuedBy: data.createdByEmail || data.createdByUid || null,
    });
});
/**
 * Fires when a delivery link doc is updated. We only audit the transition
 * from "active" to "revoked" — every other update (e.g. metadata patches)
 * should be a no-op for the audit trail.
 */
export const onStorageDeliveryLinkUpdated = onDocumentUpdated({
    document: 'storageDeliveryLinks/{linkId}',
    region: 'us-central1',
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const tenantId = after.tenantId || '';
    if (!tenantId)
        return;
    const wasActive = !before.revokedAt;
    const isRevoked = !!after.revokedAt;
    if (!(wasActive && isRevoked))
        return;
    await writeAuditEntry({
        type: 'storage.deliveryLink.revoked',
        tenantId,
        linkId: event.params.linkId,
        path: after.path ?? null,
        assetId: after.assetId ?? null,
        versionId: after.versionId ?? null,
        revokedAt: after.revokedAt,
        revokedBy: after.revokedByEmail || after.revokedByUid || null,
    });
});
/**
 * Audit entry for any object finalized under `tenants/{tid}/...` paths so the
 * tenant has a permanent record of every upload (size, mime, who uploaded).
 *
 * Skips:
 *   - any path under `/proxies/` (these are derived assets created by our own
 *     thumbnail/preview functions and would create infinite-ish noise),
 *   - non-tenant paths like `public/showcase/*` (handled separately if needed).
 */
export const onTenantObjectFinalized = onObjectFinalized({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
}, async (event) => {
    const filePath = event.data.name;
    if (!filePath)
        return;
    if (isProxyPath(filePath))
        return;
    if (!filePath.startsWith('tenants/'))
        return;
    const tenantId = filePath.split('/')[1];
    if (!tenantId)
        return;
    const parsed = parseProjectAssetPath(filePath);
    const sizeBytes = Number(event.data.size || 0);
    const sizeMb = sizeBytes ? Math.round((sizeBytes / (1024 * 1024)) * 10) / 10 : 0;
    await writeAuditEntry({
        type: 'storage.object.finalized',
        tenantId,
        path: filePath,
        contentType: event.data.contentType || null,
        sizeBytes,
        sizeMb,
        module: parsed?.module ?? null,
        projectId: parsed?.projectId ?? null,
        assetId: parsed?.assetId ?? null,
        versionId: parsed?.version ?? null,
        uploaderUid: event.data.metadata?.uploaderUid ?? null,
        uploaderEmail: event.data.metadata?.uploaderEmail ?? null,
    });
});
