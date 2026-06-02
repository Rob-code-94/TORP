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
