import { describe, expect, it } from 'vitest';
import {
  gridPosterUrl,
  groupRailProjects,
  normalizeFeaturedVideoSegment,
  railOrientation,
} from './portfolioMedia';
import type { VideoProject } from '../types';

describe('normalizeFeaturedVideoSegment', () => {
  it('defaults to zero start with no end', () => {
    expect(normalizeFeaturedVideoSegment()).toEqual({ startSeconds: 0 });
  });

  it('accepts valid start and end', () => {
    expect(normalizeFeaturedVideoSegment(5, 25)).toEqual({
      startSeconds: 5,
      endSeconds: 25,
    });
  });

  it('drops end when not greater than start', () => {
    expect(normalizeFeaturedVideoSegment(10, 10)).toEqual({ startSeconds: 10 });
    expect(normalizeFeaturedVideoSegment(10, 5)).toEqual({ startSeconds: 10 });
  });

  it('clamps invalid values', () => {
    expect(normalizeFeaturedVideoSegment(-1, 20)).toEqual({ startSeconds: 0, endSeconds: 20 });
    expect(normalizeFeaturedVideoSegment(NaN, 20)).toEqual({ startSeconds: 0, endSeconds: 20 });
  });
});

describe('gridPosterUrl', () => {
  it('prefers thumbnail over heroImage', () => {
    const project = {
      thumbnail: ' /thumb.jpg ',
      heroImage: '/hero.jpg',
    } as VideoProject;
    expect(gridPosterUrl(project)).toBe('/thumb.jpg');
  });
});

describe('railOrientation', () => {
  it('maps square and video to horizontal', () => {
    expect(railOrientation('video')).toBe('horizontal');
    expect(railOrientation('square')).toBe('horizontal');
    expect(railOrientation('portrait')).toBe('portrait');
  });
});

describe('groupRailProjects', () => {
  const p = (id: string, aspect: VideoProject['aspectRatio']): VideoProject =>
    ({ id, aspectRatio: aspect } as VideoProject);

  it('pairs consecutive same-orientation projects', () => {
    expect(groupRailProjects([p('a', 'video'), p('b', 'video'), p('c', 'portrait')])).toEqual([
      [p('a', 'video'), p('b', 'video')],
      [p('c', 'portrait')],
    ]);
  });

  it('leaves odd items as single columns', () => {
    expect(groupRailProjects([p('a', 'portrait'), p('b', 'video')])).toEqual([
      [p('a', 'portrait')],
      [p('b', 'video')],
    ]);
  });
});
