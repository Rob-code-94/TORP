import { describe, expect, it } from 'vitest';
import {
  isHostedProductionLikeHost,
  shouldShowMisconfiguredBanner,
} from './firebaseMisconfigBanner';

describe('isHostedProductionLikeHost', () => {
  it('matches the Cloud Run hostname pattern', () => {
    expect(
      isHostedProductionLikeHost(
        'torp-cinematic-production-management-ks75xiqola-uw.a.run.app',
      ),
    ).toBe(true);
  });

  it('matches Firebase Hosting domains', () => {
    expect(isHostedProductionLikeHost('torp-hub.web.app')).toBe(true);
    expect(isHostedProductionLikeHost('torp-hub.firebaseapp.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isHostedProductionLikeHost('TORP-HUB.WEB.APP')).toBe(true);
  });

  it('does not match localhost or unrelated hosts', () => {
    expect(isHostedProductionLikeHost('localhost')).toBe(false);
    expect(isHostedProductionLikeHost('127.0.0.1')).toBe(false);
    expect(isHostedProductionLikeHost('staging.example.com')).toBe(false);
    expect(isHostedProductionLikeHost(undefined)).toBe(false);
    expect(isHostedProductionLikeHost(null)).toBe(false);
    expect(isHostedProductionLikeHost('')).toBe(false);
  });

  it('does not match domains that merely contain run.app as a substring', () => {
    expect(isHostedProductionLikeHost('myrun.appfake.com')).toBe(false);
  });
});

describe('shouldShowMisconfiguredBanner', () => {
  const hostedHost = 'torp-hub.web.app';

  it('returns false when Firebase is configured', () => {
    expect(
      shouldShowMisconfiguredBanner({
        isConfigured: true,
        hostname: hostedHost,
        dismissed: false,
      }),
    ).toBe(false);
  });

  it('returns false when the user dismissed it for this session', () => {
    expect(
      shouldShowMisconfiguredBanner({
        isConfigured: false,
        hostname: hostedHost,
        dismissed: true,
      }),
    ).toBe(false);
  });

  it('returns false on localhost even when Firebase is unconfigured', () => {
    expect(
      shouldShowMisconfiguredBanner({
        isConfigured: false,
        hostname: 'localhost',
        dismissed: false,
      }),
    ).toBe(false);
  });

  it('returns true on hosted domain when unconfigured and not dismissed', () => {
    expect(
      shouldShowMisconfiguredBanner({
        isConfigured: false,
        hostname: hostedHost,
        dismissed: false,
      }),
    ).toBe(true);
  });
});
