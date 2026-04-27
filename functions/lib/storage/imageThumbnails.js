import { logger } from 'firebase-functions/v2';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import sharp from 'sharp';
import { isProxyPath, parseProjectAssetPath, thumbnailPath } from './storagePaths.js';
/**
 * Default proxy widths for project & deliverable image assets. Picked to cover
 * (a) thumbnail/list rows (256), (b) card hero images (640), and (c) lightbox
 * previews on retina (1280). Values land back at
 * `{versionDir}/proxies/thumb_{w}.jpg` and are referenced from the AssetVersion
 * doc by Cloud Functions in MVP-11.
 */
const DEFAULT_WIDTHS = [256, 640, 1280];
const ALLOWED_PREFIXES = ['image/'];
function isImageContentType(contentType) {
    if (!contentType)
        return false;
    const lower = contentType.toLowerCase();
    return ALLOWED_PREFIXES.some((p) => lower.startsWith(p));
}
/**
 * Re-renders an image to a max width of `width` while preserving aspect ratio,
 * encoded as a progressive JPEG so it can stream into list/card UI. Caller
 * provides the source bytes; we never touch the original on disk.
 */
async function renderJpegThumbnail(input, width) {
    return sharp(input, { failOn: 'none' })
        .rotate() // honor EXIF orientation
        .resize({ width, withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
}
/**
 * onObjectFinalized trigger that materializes JPEG thumbnails for any image
 * uploaded under `tenants/{tid}/{projects|deliverables}/.../{version}/<file>`.
 * Skips:
 *   - non-image MIME types (handled by separate doc/video pipelines later),
 *   - paths that already live under `/proxies/` (avoids feedback loops),
 *   - paths that don't match the canonical asset shape (e.g. user avatars,
 *     org identity, showcase content).
 */
export const onImageAssetFinalized = onObjectFinalized({
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 120,
    cpu: 1,
}, async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType || '';
    if (!filePath)
        return;
    if (isProxyPath(filePath)) {
        logger.debug('thumbnails: skip proxy path', { filePath });
        return;
    }
    if (!isImageContentType(contentType)) {
        logger.debug('thumbnails: skip non-image', { filePath, contentType });
        return;
    }
    const parsed = parseProjectAssetPath(filePath);
    if (!parsed) {
        logger.debug('thumbnails: skip non-asset path', { filePath });
        return;
    }
    const bucket = getStorage().bucket(event.data.bucket);
    const sourceFile = bucket.file(filePath);
    const [sourceBuffer] = await sourceFile.download();
    const tasks = DEFAULT_WIDTHS.map(async (width) => {
        const targetPath = thumbnailPath(parsed.versionDir, width);
        try {
            const buf = await renderJpegThumbnail(sourceBuffer, width);
            await bucket.file(targetPath).save(buf, {
                contentType: 'image/jpeg',
                resumable: false,
                metadata: {
                    cacheControl: 'private, max-age=3600',
                    metadata: {
                        tenantId: parsed.tenantId,
                        projectId: parsed.projectId,
                        assetId: parsed.assetId,
                        versionId: parsed.version,
                        originalPath: filePath,
                        proxyKind: 'image-thumbnail',
                        proxyWidth: String(width),
                    },
                },
            });
            return { width, path: targetPath, bytes: buf.byteLength };
        }
        catch (err) {
            logger.error('thumbnails: failed to render width', {
                filePath,
                width,
                err: err?.message,
            });
            return null;
        }
    });
    const results = (await Promise.all(tasks)).filter((r) => r !== null);
    if (results.length === 0) {
        logger.warn('thumbnails: no proxies produced', { filePath });
        return;
    }
    // Write a small marker doc so other Cloud Functions / clients can discover
    // proxies without listing storage. Path mirrors the AssetVersion identity:
    // tenants/{tid}/projects/{projectId}/assetVersions/{assetId}_{version}.
    try {
        const db = getFirestore();
        const docId = `${parsed.assetId}_${parsed.version}`;
        const ref = db
            .collection('tenants')
            .doc(parsed.tenantId)
            .collection(parsed.module)
            .doc(parsed.projectId)
            .collection('assetVersions')
            .doc(docId);
        await ref.set({
            tenantId: parsed.tenantId,
            projectId: parsed.projectId,
            assetId: parsed.assetId,
            versionId: parsed.version,
            originalPath: filePath,
            contentType,
            updatedAt: new Date().toISOString(),
            proxies: {
                image: results.map((r) => ({ width: r.width, path: r.path, bytes: r.bytes })),
            },
        }, { merge: true });
    }
    catch (err) {
        // Non-fatal: the proxies still live in storage.
        logger.warn('thumbnails: could not write assetVersions doc', {
            filePath,
            err: err?.message,
        });
    }
    logger.info('thumbnails: generated proxies', {
        filePath,
        count: results.length,
        widths: results.map((r) => r.width),
    });
});
