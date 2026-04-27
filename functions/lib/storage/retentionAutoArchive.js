import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { isProxyPath, parseProjectAssetPath } from './storagePaths.js';
/**
 * MVP-13: Retention auto-archive cron.
 *
 * Walks every tenant's storage tree and, for each canonical project/deliverable
 * asset, applies the tenant's `StoragePolicy.retentionDaysByClass` rule:
 *
 *   - `legal_hold`  → never archived (tagged with metadata only)
 *   - `finance`     → archived after `finance` days (default 7 years)
 *   - `default`     → archived after `default` days (default 1 year)
 *
 * "Archive" here means we copy the bytes to
 * `archive/tenants/{tid}/...` (a sibling top-level path) and delete the
 * original from the live tree. The archive prefix is intentionally outside
 * the tenant rule so it's only readable by Cloud Functions / admins via the
 * Cloud Console. We also stamp `tenants/{tid}/auditLog` with a
 * `storage.archived` row so the move shows up in the audit trail.
 *
 * Running once a day with hard caps keeps a long-tenured bucket bounded.
 */
const MAX_FILES_PER_TENANT = 5000;
const ARCHIVE_PREFIX = 'archive/';
async function loadPolicy(tenantId) {
    try {
        const db = getFirestore();
        const snap = await db.collection('storagePolicies').doc(tenantId).get();
        if (!snap.exists)
            return null;
        return snap.data();
    }
    catch (err) {
        logger.warn('retention-cron: policy load failed', {
            tenantId,
            err: err?.message,
        });
        return null;
    }
}
async function loadRetentionOverrides(tenantId) {
    const overrides = new Map();
    try {
        const db = getFirestore();
        const snap = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('projectAssets')
            .get();
        snap.forEach((doc) => {
            const data = doc.data();
            const path = data?.storage?.path;
            if (!path)
                return;
            overrides.set(path, {
                retentionClass: data.retentionClass || 'default',
                legalHold: data.legalHold ?? false,
            });
        });
    }
    catch (err) {
        logger.warn('retention-cron: project asset overrides scan failed', {
            tenantId,
            err: err?.message,
        });
    }
    return overrides;
}
async function tenantsToScan() {
    const db = getFirestore();
    const ids = new Set();
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
                out.push(file);
            }
            pageToken = query?.pageToken;
        } while (pageToken && out.length < max);
    }
    return out;
}
async function writeAuditRow(tenantId, payload) {
    try {
        const db = getFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('auditLog')
            .add({
            ...payload,
            at: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        logger.warn('retention-cron: audit write failed', {
            tenantId,
            err: err?.message,
        });
    }
}
async function reconcileTenant(tenantId) {
    const policy = await loadPolicy(tenantId);
    if (!policy) {
        return { scanned: 0, archived: 0, skipped: 0 };
    }
    const overrides = await loadRetentionOverrides(tenantId);
    const files = await listTenantFiles(tenantId, MAX_FILES_PER_TENANT);
    const bucket = getStorage().bucket();
    const now = Date.now();
    let archivedCount = 0;
    let skippedCount = 0;
    for (const file of files) {
        const updated = file.metadata?.updated;
        const updatedMs = updated ? new Date(updated).getTime() : now;
        const ageDays = Math.floor((now - updatedMs) / (1000 * 60 * 60 * 24));
        const override = overrides.get(file.name);
        const retentionClass = override?.retentionClass ?? (policy.legalHoldDefault ? 'legal_hold' : 'default');
        const legalHold = override?.legalHold ?? policy.legalHoldDefault;
        if (legalHold || retentionClass === 'legal_hold') {
            skippedCount += 1;
            continue;
        }
        const limit = retentionClass === 'finance'
            ? policy.retentionDaysByClass.finance
            : policy.retentionDaysByClass.default;
        if (!Number.isFinite(limit) || limit <= 0) {
            skippedCount += 1;
            continue;
        }
        if (ageDays < limit) {
            skippedCount += 1;
            continue;
        }
        const archivePath = `${ARCHIVE_PREFIX}${file.name}`;
        try {
            await file.copy(bucket.file(archivePath));
            await file.delete();
            archivedCount += 1;
            const parsed = parseProjectAssetPath(file.name);
            await writeAuditRow(tenantId, {
                type: 'storage.archived',
                tenantId,
                path: file.name,
                archivePath,
                retentionClass,
                ageDays,
                sizeBytes: Number(file.metadata?.size || 0),
                contentType: file.metadata?.contentType ?? null,
                module: parsed?.module ?? null,
                projectId: parsed?.projectId ?? null,
                assetId: parsed?.assetId ?? null,
                versionId: parsed?.version ?? null,
            });
        }
        catch (err) {
            logger.error('retention-cron: archive failed', {
                tenantId,
                path: file.name,
                err: err?.message,
            });
        }
    }
    return { scanned: files.length, archived: archivedCount, skipped: skippedCount };
}
/**
 * Scheduler entrypoint. Runs at 04:00 daily so it lands after the orphan
 * reconciliation job (03:15) and never overlaps within the same hour.
 */
export const enforceStorageRetention = onSchedule({
    region: 'us-central1',
    schedule: '0 4 * * *',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
}, async () => {
    const tenants = await tenantsToScan();
    logger.info('retention-cron: starting', { tenants });
    for (const tenantId of tenants) {
        try {
            const result = await reconcileTenant(tenantId);
            logger.info('retention-cron: tenant complete', { tenantId, ...result });
        }
        catch (err) {
            logger.error('retention-cron: tenant failed', {
                tenantId,
                err: err?.message,
            });
        }
    }
});
