import type React from 'react';
import { UserRole } from '../../types';
import type { AuthRole } from '../auth';

/**
 * Registered integrations are rendered by `<IntegrationsPage />`.
 * Each integration has a stable id and a render function that produces a
 * fully-formed card for either the personal or org section.
 *
 * Adding a new integration is one file under
 * `components/hq/settings/integrations/` plus one entry in
 * `INTEGRATION_REGISTRY` below.
 */

export type IntegrationScope = 'personal' | 'org';

export type IntegrationStatus =
  | 'connected'
  | 'not_connected'
  | 'error'
  | 'pending'
  | 'coming_soon';

export interface IntegrationAvailability {
  /** `true` when at least one card variant is renderable for this user. */
  available: boolean;
}

export interface IntegrationRenderProps {
  /** Active dashboard theme. */
  isDark: boolean;
  /** Logged-in user role. Cards may further constrain inside `render`. */
  role: AuthRole;
}

export interface IntegrationDefinition {
  id: string;
  label: string;
  /** Short description shown above the card; one line. */
  blurb: string;
  /** Optional logo / glyph (lucide icon name string is rendered by the card). */
  iconName?: string;
  scope: IntegrationScope;
  /** Roles that should see this integration card. */
  roles: AuthRole[];
  /** Whether to actually render now. Use to gate behind feature flags. */
  isAvailable: (role: AuthRole) => boolean;
  /** Renders the card body. Card chrome is provided by `IntegrationCard`. */
  render: (props: IntegrationRenderProps) => React.ReactNode;
}

const definitions: IntegrationDefinition[] = [];

/** Register an integration during module load (call once per definition). */
export function registerIntegration(def: IntegrationDefinition) {
  if (definitions.some((existing) => existing.id === def.id)) return;
  definitions.push(def);
}

/** All registered integration definitions, ordered by registration. */
export function listAllIntegrations(): IntegrationDefinition[] {
  return [...definitions];
}

/** Filter the registry for the active role and an optional scope. */
export function getIntegrations(
  role: AuthRole,
  scope?: IntegrationScope
): IntegrationDefinition[] {
  return definitions.filter((def) => {
    if (!def.roles.includes(role)) return false;
    if (scope && def.scope !== scope) return false;
    return def.isAvailable(role);
  });
}

/**
 * Convenience: do any integrations exist that this role can see?
 * Used by the page to decide whether to show the "future integrations" hint.
 */
export function hasAnyIntegrations(role: AuthRole): boolean {
  return getIntegrations(role).length > 0;
}

/** Roles that may see any integration UI. */
export const INTEGRATION_ELIGIBLE_ROLES: ReadonlyArray<AuthRole> = [
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.STAFF,
];
