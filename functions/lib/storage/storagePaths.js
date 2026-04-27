/**
 * Server-side mirrors of `lib/storagePaths.ts` from the web app. Cloud Functions
 * only run on this side of the wire so we duplicate the small set of pure
 * helpers we need (parsing & proxy path derivation) instead of building a
 * shared package for two helpers.
 */
/**
 * Returns metadata for paths shaped like
 * `tenants/{tenantId}/{projects|deliverables}/{projectId}/{assetId}/{version}/{filename}`,
 * or `null` if the input path does not match this shape (e.g. `proxies/`,
 * users avatars, org assets, etc.).
 */
export function parseProjectAssetPath(path) {
    if (!path)
        return null;
    const parts = path.split('/');
    // tenants/{tid}/{module}/{projectId}/{assetId}/{version}/{filename}
    if (parts.length !== 7)
        return null;
    if (parts[0] !== 'tenants')
        return null;
    const moduleName = parts[2];
    if (moduleName !== 'projects' && moduleName !== 'deliverables')
        return null;
    const filename = parts[6];
    if (!filename)
        return null;
    // Skip already-derived proxies under the version dir (defensive).
    if (parts[5] === 'proxies')
        return null;
    return {
        tenantId: parts[1],
        module: moduleName,
        projectId: parts[3],
        assetId: parts[4],
        version: parts[5],
        filename,
        versionDir: parts.slice(0, 6).join('/'),
    };
}
export function thumbnailPath(versionDir, width) {
    return `${versionDir}/proxies/thumb_${width}.jpg`;
}
export function pdfPreviewPath(versionDir) {
    return `${versionDir}/proxies/preview_p1.jpg`;
}
export function isProxyPath(path) {
    return /\/proxies\//.test(path);
}
