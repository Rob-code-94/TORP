import { logger } from 'firebase-functions/v2';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { isProxyPath, parseProjectAssetPath } from './storagePaths.js';
/**
 * V2 video transcode pipeline scaffold.
 *
 * For each newly uploaded project/deliverable video, create a transcode job
 * record under `tenants/{tenantId}/transcodeJobs/{auto}`. This keeps the queue
 * observable immediately while we wire Cloud Transcoder API execution per
 * environment (project-level IAM + template setup).
 */
export const enqueueVideoTranscode = onObjectFinalized({
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
}, async (event) => {
    const filePath = event.data.name;
    const contentType = (event.data.contentType || '').toLowerCase();
    if (!filePath || isProxyPath(filePath))
        return;
    if (!contentType.startsWith('video/'))
        return;
    const parsed = parseProjectAssetPath(filePath);
    if (!parsed)
        return;
    const db = getFirestore();
    await db
        .collection('tenants')
        .doc(parsed.tenantId)
        .collection('transcodeJobs')
        .add({
        tenantId: parsed.tenantId,
        projectId: parsed.projectId,
        assetId: parsed.assetId,
        versionId: parsed.version,
        path: filePath,
        contentType,
        sizeBytes: Number(event.data.size || 0),
        status: 'queued',
        provider: 'gcp-transcoder',
        createdAt: FieldValue.serverTimestamp(),
    });
    logger.info('transcode: queued job', {
        tenantId: parsed.tenantId,
        path: filePath,
    });
});
