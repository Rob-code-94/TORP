import { describe, expect, it } from 'vitest';
import { normalizeFeaturedVideoSegment } from './portfolioMedia';

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
