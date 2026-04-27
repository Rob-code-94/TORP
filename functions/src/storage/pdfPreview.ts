import { logger } from 'firebase-functions/v2';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import sharp from 'sharp';
import { isProxyPath, parseProjectAssetPath, pdfPreviewPath } from './storagePaths.js';

/**
 * MVP-9 PDF first-page preview.
 *
 * pdfjs-dist + @napi-rs/canvas render page 1 to a PNG buffer; sharp re-encodes
 * to a JPEG sized for hero/list usage. The result lives at
 * `{versionDir}/proxies/preview_p1.jpg`. The same paths and Firestore marker
 * doc semantics apply as in `imageThumbnails.ts` (MVP-8) so downstream UI can
 * treat both proxy types uniformly.
 *
 * NOTE: pdfjs is loaded dynamically because its module evaluation pulls in DOM
 * shims and we want it tree-shaken from cold-starts that aren't processing
 * PDFs. The legacy build is the Node-friendly variant.
 */

const PREVIEW_WIDTH_PX = 1024;

function isPdfContentType(contentType: string | undefined | null, filename: string): boolean {
  const lower = (contentType || '').toLowerCase();
  if (lower === 'application/pdf' || lower === 'application/x-pdf') return true;
  return /\.pdf$/i.test(filename);
}

interface RenderedPreview {
  buffer: Buffer;
  widthPx: number;
  heightPx: number;
}

async function renderFirstPage(pdfBytes: Buffer): Promise<RenderedPreview | null> {
  type CanvasModule = typeof import('@napi-rs/canvas');
  let canvasModule: CanvasModule;
  try {
    canvasModule = await import('@napi-rs/canvas');
  } catch (err) {
    logger.error('pdf-preview: @napi-rs/canvas not available', { err: (err as Error)?.message });
    return null;
  }
  const { createCanvas } = canvasModule;

  type PdfModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfModule;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = PREVIEW_WIDTH_PX / Math.max(1, baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    const png = await canvas.encode('png');
    return { buffer: Buffer.from(png), widthPx: canvas.width, heightPx: canvas.height };
  } finally {
    await pdf.destroy();
  }
}

export const onPdfAssetFinalized = onObjectFinalized(
  {
    region: 'us-central1',
    memory: '2GiB',
    timeoutSeconds: 240,
    cpu: 1,
  },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType || '';
    if (!filePath) return;
    if (isProxyPath(filePath)) return;
    const parsed = parseProjectAssetPath(filePath);
    if (!parsed) return;
    if (!isPdfContentType(contentType, parsed.filename)) return;

    const bucket = getStorage().bucket(event.data.bucket);
    const sourceFile = bucket.file(filePath);
    const [pdfBytes] = await sourceFile.download();

    const rendered = await renderFirstPage(pdfBytes);
    if (!rendered) {
      logger.error('pdf-preview: render failed', { filePath });
      return;
    }
    const jpeg = await sharp(rendered.buffer)
      .jpeg({ quality: 78, progressive: true })
      .toBuffer();
    const targetPath = pdfPreviewPath(parsed.versionDir);
    await bucket.file(targetPath).save(jpeg, {
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
          proxyKind: 'pdf-preview',
          pageWidth: String(rendered.widthPx),
          pageHeight: String(rendered.heightPx),
        },
      },
    });

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
      await ref.set(
        {
          tenantId: parsed.tenantId,
          projectId: parsed.projectId,
          assetId: parsed.assetId,
          versionId: parsed.version,
          originalPath: filePath,
          contentType,
          updatedAt: new Date().toISOString(),
          proxies: {
            pdfPreview: {
              path: targetPath,
              widthPx: rendered.widthPx,
              heightPx: rendered.heightPx,
              bytes: jpeg.byteLength,
            },
          },
        },
        { merge: true },
      );
    } catch (err) {
      logger.warn('pdf-preview: marker doc write failed', {
        filePath,
        err: (err as Error)?.message,
      });
    }
    logger.info('pdf-preview: generated preview', {
      filePath,
      previewPath: targetPath,
      bytes: jpeg.byteLength,
    });
  },
);
