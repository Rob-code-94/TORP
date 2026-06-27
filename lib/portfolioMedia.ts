import type { GalleryAspect, VideoProject } from '../types';

export const CARD_ASPECT_OPTIONS: ReadonlyArray<{
  value: VideoProject['aspectRatio'];
  label: string;
}> = [
  { value: 'video', label: 'Horizontal (16:9)' },
  { value: 'portrait', label: 'Vertical (9:16)' },
  { value: 'square', label: 'Square (1:1)' },
];

export function cardAspectLabel(aspect: VideoProject['aspectRatio']): string {
  const match = CARD_ASPECT_OPTIONS.find((o) => o.value === aspect);
  return match?.label ?? aspect;
}

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
    case 'video':
      return 'aspect-video';
    default: {
      const _exhaustive: never = aspect;
      return _exhaustive;
    }
  }
}

/** Mobile rail: compact 16:9 for landscape/square; full vertical stack for portrait. */
export function railMediaAspectClass(aspect: VideoProject['aspectRatio']): string {
  switch (aspect) {
    case 'portrait':
      return 'aspect-[9/16]';
    case 'square':
    case 'video':
      return 'aspect-video';
    default: {
      const _exhaustive: never = aspect;
      return _exhaustive;
    }
  }
}

export function projectPosterUrl(project: VideoProject): string {
  return project.heroImage?.trim() || project.thumbnail?.trim() || '';
}

/** Mobile rail: prefer grid-sized thumbnail over large hero poster. */
export function gridPosterUrl(project: VideoProject): string {
  return project.thumbnail?.trim() || project.heroImage?.trim() || '';
}

export function portfolioOrientationBadgeLabel(aspect: VideoProject['aspectRatio']): string {
  switch (aspect) {
    case 'video':
      return 'Horizontal';
    case 'portrait':
      return 'Vertical';
    case 'square':
      return 'Square';
    default: {
      const _exhaustive: never = aspect;
      return _exhaustive;
    }
  }
}

export type RailOrientation = 'horizontal' | 'portrait';

export function railOrientation(aspect: VideoProject['aspectRatio']): RailOrientation {
  return aspect === 'portrait' ? 'portrait' : 'horizontal';
}

/** Pair consecutive same-orientation projects into one mobile rail snap column. */
export function groupRailProjects(projects: VideoProject[]): VideoProject[][] {
  const groups: VideoProject[][] = [];
  let i = 0;
  while (i < projects.length) {
    const current = projects[i];
    const next = projects[i + 1];
    if (next && railOrientation(current.aspectRatio) === railOrientation(next.aspectRatio)) {
      groups.push([current, next]);
      i += 2;
    } else {
      groups.push([current]);
      i += 1;
    }
  }
  return groups;
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
