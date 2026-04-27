import { describe, expect, it } from 'vitest';
import { UserRole } from '../types';
import {
  buildTourStepsForContext,
  resolveTourPackId,
  type TourContext,
} from '../lib/hqAdminTour';

describe('resolveTourPackId', () => {
  it('resolves command pack on admin root', () => {
    expect(resolveTourPackId('/hq/admin', UserRole.ADMIN)).toBe('admin-command');
  });

  it('resolves specific routes before generic admin root', () => {
    expect(resolveTourPackId('/hq/admin/financials', UserRole.ADMIN)).toBe('admin-financials');
    expect(resolveTourPackId('/hq/admin/clients', UserRole.ADMIN)).toBe('admin-clients');
  });

  it('resolves staff project detail pack for staff role', () => {
    expect(resolveTourPackId('/hq/admin/projects/p123', UserRole.STAFF)).toBe('project-detail-staff');
  });
});

describe('buildTourStepsForContext', () => {
  const hasAllSelectors = () => true;

  it('filters PM financial steps when nav access is missing', () => {
    const ctx: TourContext = {
      pathname: '/hq/admin/financials',
      role: UserRole.PROJECT_MANAGER,
      allowedNavIds: ['command', 'projects', 'planner', 'crew'],
    };
    const steps = buildTourStepsForContext(ctx, hasAllSelectors);
    expect(steps).toHaveLength(0);
  });

  it('keeps admin financial steps when nav access exists', () => {
    const ctx: TourContext = {
      pathname: '/hq/admin/financials',
      role: UserRole.ADMIN,
      allowedNavIds: ['financials'],
    };
    const steps = buildTourStepsForContext(ctx, hasAllSelectors);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('skips missing selector steps without throwing', () => {
    const ctx: TourContext = {
      pathname: '/hq/admin/projects',
      role: UserRole.ADMIN,
      allowedNavIds: ['projects'],
    };
    const steps = buildTourStepsForContext(
      ctx,
      (selector) => selector === '[data-tour="projects-header"]'
    );
    expect(steps.length).toBeGreaterThan(0);
    expect(
      steps.every((step) => !('element' in step) || step.element === '[data-tour="projects-header"]')
    ).toBe(true);
  });
});
