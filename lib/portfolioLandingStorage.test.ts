import { describe, expect, it } from 'vitest';
import {
  PORTFOLIO_VIDEO_MAX_BYTES,
  PORTFOLIO_VIDEO_WARN_BYTES,
  portfolioVideoSizeWarning,
  validatePortfolioVideoFileSize,
} from './portfolioLandingStorage';

describe('portfolio video size policy', () => {
  it('exports expected byte thresholds', () => {
    expect(PORTFOLIO_VIDEO_WARN_BYTES).toBe(200 * 1024 * 1024);
    expect(PORTFOLIO_VIDEO_MAX_BYTES).toBe(500 * 1024 * 1024);
  });

  it('warns above soft threshold only', () => {
    expect(portfolioVideoSizeWarning(100 * 1024 * 1024)).toBeUndefined();
    expect(portfolioVideoSizeWarning(250 * 1024 * 1024)).toMatch(/250 MB/);
  });

  it('rejects above hard max', () => {
    expect(() => validatePortfolioVideoFileSize(501 * 1024 * 1024)).toThrow(/500 MB/);
    expect(() => validatePortfolioVideoFileSize(400 * 1024 * 1024)).not.toThrow();
  });
});
