export interface StoragePathInput {
  tenantId: string;
  module: 'projects' | 'deliverables' | 'planner' | 'finance' | 'crew';
  projectId?: string;
  entityId: string;
  version?: string;
  filename: string;
}

function sanitizePathSegment(segment: string): string {
  return segment.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
}

function sanitizeTenantId(tenantId: string): string {
  const safe = sanitizePathSegment(tenantId);
  return safe.length ? safe : 'tenant-unknown';
}

export function resolveActiveTenantId(): string {
  const tenantFromEnv = (import.meta.env.VITE_TORP_TENANT_ID as string | undefined)?.trim();
  return sanitizeTenantId(tenantFromEnv || 'torp-default');
}

export function buildStoragePath(input: StoragePathInput): string {
  const tenantId = sanitizeTenantId(input.tenantId);
  const moduleName = sanitizePathSegment(input.module);
  const entityId = sanitizePathSegment(input.entityId);
  const filename = sanitizePathSegment(input.filename);
  const version = sanitizePathSegment(input.version || 'v1');

  if (moduleName === 'projects' || moduleName === 'deliverables') {
    const projectId = sanitizePathSegment(input.projectId || 'project-unknown');
    return `tenants/${tenantId}/${moduleName}/${projectId}/${entityId}/${version}/${filename}`;
  }
  return `tenants/${tenantId}/${moduleName}/${entityId}/${version}/${filename}`;
}
