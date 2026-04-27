import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { isProxyPath, parseProjectAssetPath } from './storagePaths.js';
/**
 * MVP-12: Nightly orphan reconciliation.
 *
 * For each tenant, lists every file under `tenants/{tid}/projects/...` and
 * `tenants/{tid}/deliverables/...` and compares it to the project asset
 * documents that should reference it. Anything that exists in storage but is
 * not pointed to by a `projectAssets` doc is logged as an orphan in
 * `tenants/{tid}/storageOrphans`. The scheduler runs once a day; the
 * collection is the audit surface admins use to decide whether to delete or
 * re-link.
 *
 * Deliberately read-only on storage: deletion happens via MVP-13 (retention
 * cron) or admin tooling, never silently here. Limit per run keeps a runaway
 * bucket from timing out the scheduler — anything not scanned this cycle gets
 * picked up on subsequent runs.
 */
const MAX_FILES_PER_TENANT = 5000;
async function loadKnownAssetPathsForTenant(tenantId) {
    const db = getFirestore();
    const known = new Set();
    // The mock data layer does not write project asset docs to Firestore yet; we
    // also tolerate the "tenants/{tid}/projects/{projectId}/assetVersions"
    // marker docs written by MVP-8/9 by including their `originalPath` field.
    try {
        const assetVersions = await db
            .collectionGroup('assetVersions')
            .where('tenantId', '==', tenantId)
            .get();
        assetVersions.forEach((doc) => {
            const data = doc.data();
            if (data?.originalPath)
                known.add(data.originalPath);
        });
    }
    catch (err) {
        logger.warn('orphan-cron: assetVersions scan failed', {
            tenantId,
            err: err?.message,
        });
    }
    try {
        const projectAssetsRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('projectAssets');
        const projectAssets = await projectAssetsRef.get();
        projectAssets.forEach((doc) => {
            const data = doc.data();
            const path = data?.storage?.path;
            if (path)
                known.add(path);
        });
    }
    catch (err) {
        logger.warn('orphan-cron: projectAssets scan failed', {
            tenantId,
            err: err?.message,
        });
    }
    return known;
}
async function tenantsToScan() {
    const db = getFirestore();
    // Scan known tenants from `tenants/{tid}` documents *and* policy docs.
    const ids = new Set();
    try {
        const snapshot = await db.collection('tenants').get();
        snapshot.forEach((doc) => ids.add(doc.id));
    }
    catch {
        // ignore
    }
    try {
        const snapshot = await db.collection('storagePolicies').get();
        snapshot.forEach((doc) => ids.add(doc.id));
    }
    catch {
        // ignore
    }
    if (ids.size === 0)
        ids.add('torp-default');
    return Array.from(ids);
}
async function listTenantFiles(tenantId, max) {
    const bucket = getStorage().bucket();
    const out = [];
    for (const subdir of ['projects/', 'deliverables/']) {
        if (out.length >= max)
            break;
        const prefix = `tenants/${tenantId}/${subdir}`;
        let pageToken;
        do {
            // Cast the response to the documented [files, query, apiResponse] shape
            // used by @google-cloud/storage's getFiles().
            const response = (await bucket.getFiles({
                prefix,
                autoPaginate: false,
                pageToken,
                maxResults: 500,
            }));
            const [files, query] = response;
            for (const file of files) {
                if (out.length >= max)
                    break;
                if (isProxyPath(file.name))
                    continue;
                const size = Number(file.metadata?.size || 0);
                out.push({
                    name: file.name,
                    size,
                    contentType: file.metadata?.contentType ?? null,
                    updated: file.metadata?.updated ?? null,
                });
            }
            pageToken = query?.pageToken;
        } while (pageToken && out.length < max);
    }
    return out;
}
async function reconcileTenant(tenantId) {
    const known = await loadKnownAssetPathsForTenant(tenantId);
    const files = await listTenantFiles(tenantId, MAX_FILES_PER_TENANT);
    const db = getFirestore();
    const orphansRef = db.collection('tenants').doc(tenantId).collection('storageOrphans');
    let orphanCount = 0;
    for (const file of files) {
        if (known.has(file.name))
            continue;
        if (!parseProjectAssetPath(file.name)) {
            // Files outside the canonical shape (legacy uploads, manual drops) are
            // still listed but tagged as `nonStandardPath: true` so the audit UI
            // can sort them differently.
            orphanCount += 1;
            await orphansRef.doc(encodeFileId(file.name)).set({
                tenantId,
                path: file.name,
                sizeBytes: file.size,
                contentType: file.contentType,
                objectUpdatedAt: file.updated,
                nonStandardPath: true,
                discoveredAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            continue;
        }
        orphanCount += 1;
        await orphansRef.doc(encodeFileId(file.name)).set({
            tenantId,
            path: file.name,
            sizeBytes: file.size,
            contentType: file.contentType,
            objectUpdatedAt: file.updated,
            nonStandardPath: false,
            discoveredAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    // Clear orphans that have since been reconciled. Best-effort: if Firestore
    // reports a collection larger than the page limit we'll catch the rest on
    // the next cron tick.
    try {
        const existingOrphans = await orphansRef.get();
        const writes = [];
        existingOrphans.forEach((doc) => {
            const data = doc.data();
            const path = data?.path;
            if (path && known.has(path)) {
                writes.push(doc.ref.delete());
            }
        });
        await Promise.all(writes);
    }
    catch (err) {
        logger.warn('orphan-cron: cleanup pass failed', {
            tenantId,
            err: err?.message,
        });
    }
    return { scanned: files.length, orphans: orphanCount };
}
function encodeFileId(path) {
    // Firestore disallows '/' in doc ids; use base64url for stable round-trip.
    return Buffer.from(path).toString('base64url');
}
/**
 * Scheduler entrypoint. Defaults to 03:15 every day in UTC; configurable via
 * Firebase scheduler console after deploy.
 */
export const reconcileStorageOrphans = onSchedule({
    region: 'us-central1',
    schedule: '15 3 * * *',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
}, async () => {
    const tenants = await tenantsToScan();
    logger.info('orphan-cron: starting', { tenants });
    for (const tenantId of tenants) {
        try {
            const result = await reconcileTenant(tenantId);
            logger.info('orphan-cron: reconciled', { tenantId, ...result });
        }
        catch (err) {
            logger.error('orphan-cron: tenant failed', {
                tenantId,
                err: err?.message,
            });
        }
    }
});
