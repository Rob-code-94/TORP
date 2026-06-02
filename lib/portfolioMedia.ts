import type { GalleryAspect, VideoProject } from '../types';

export function galleryAspectClass(aspect: GalleryAspect): string {
  switch (aspect) {
    case 'wide':
      return 'aspect-[21/9]';
    case 'video':
      return 'aspect-video';
    case 'portrait':
      return 'aspect-[9/16]';
    case 'square':
      return 'aspect-square';
    default:
      return 'aspect-video';
  }
}

export function cardAspectClass(aspect: VideoProject['aspectRatio']): string {
  switch (aspect) {
    case 'portrait':
      return 'aspect-[9/16]';
    case 'square':
      return 'aspect-square';
    default:
      return 'aspect-video';
  }
}

export function projectPosterUrl(project: VideoProject): string {
  return project.heroImage?.trim() || project.thumbnail?.trim() || '';
}

export function normalizeFeaturedVideoSegment(
  start?: number,
  end?: number,
): { startSeconds: number; endSeconds?: number } {
  const startSeconds =
    typeof start === 'number' && Number.isFinite(start) && start >= 0 ? start : 0;
  let endSeconds: number | undefined;
  if (typeof end === 'number' && Number.isFinite(end) && end > startSeconds) {
    endSeconds = end;
  }
  return { startSeconds, endSeconds };
}

export function featuredVideoSegmentFromProject(project: VideoProject): {
  startSeconds: number;
  endSeconds?: number;
} {
  return normalizeFeaturedVideoSegment(
    project.featuredVideoStartSeconds,
    project.featuredVideoEndSeconds,
  );
}

/** Firestore payload fields — omit when start is 0 and no end. */
export function featuredVideoSegmentPayloadFields(
  project: VideoProject,
): Pick<VideoProject, 'featuredVideoStartSeconds' | 'featuredVideoEndSeconds'> {
  const { startSeconds, endSeconds } = featuredVideoSegmentFromProject(project);
  return {
    ...(startSeconds > 0 ? { featuredVideoStartSeconds: startSeconds } : {}),
    ...(endSeconds != null ? { featuredVideoEndSeconds: endSeconds } : {}),
  };
}
