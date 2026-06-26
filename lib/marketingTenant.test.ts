import { describe, expect, it } from 'vitest';
import {
  getMarketingTenantId,
  getMarketingTenantIdForUser,
  getPortfolioMarketingTenantId,
  MARKETING_TENANT_FALLBACK,
} from './marketingTenant';

describe('marketingTenant', () => {
  it('getMarketingTenantId returns a non-empty id', () => {
    expect(getMarketingTenantId().length).toBeGreaterThan(0);
  });

  it('getPortfolioMarketingTenantId matches public marketing tenant', () => {
    expect(getPortfolioMarketingTenantId()).toBe(getMarketingTenantId());
  });

  it('getPortfolioMarketingTenantId ignores JWT tenant', () => {
    expect(getPortfolioMarketingTenantId()).not.toBe(getMarketingTenantIdForUser('org-a'));
    expect(getMarketingTenantIdForUser('org-a')).toBe('org-a');
  });

  it('getMarketingTenantIdForUser prefers JWT tenant', () => {
    expect(getMarketingTenantIdForUser('org-a')).toBe('org-a');
  });

  it('getMarketingTenantIdForUser falls back like getMarketingTenantId', () => {
    expect(getMarketingTenantIdForUser(undefined)).toBe(getMarketingTenantId());
    expect(getMarketingTenantIdForUser('')).toBe(getMarketingTenantId());
  });

  it('MARKETING_TENANT_FALLBACK is stable default', () => {
    expect(MARKETING_TENANT_FALLBACK).toBe('torp-default');
  });
});
