import { httpsCallable } from 'firebase/functions';
import type { StoragePolicy, UserRole } from '../types';
import { getFirebaseFunctionsInstance } from './firebase';

type SetStoragePolicyInput = { policy: StoragePolicy };
type GetStoragePolicyInput = { tenantId?: string };

const DEFAULT_TENANT_ID = 'torp-default';

export function createDefaultStoragePolicy(updatedBy = 'system', tenantId = DEFAULT_TENANT_ID): StoragePolicy {
  return {
    tenantId,
    roleScopeMap: {
      ADMIN: { canIssueDeliveryLinks: true },
      PROJECT_MANAGER: { canIssueDeliveryLinks: true },
      STAFF: { canIssueDeliveryLinks: false },
      CLIENT: { canIssueDeliveryLinks: false },
    },
    maxSizeByMimeGroup: {
      videoMb: 10240,
      imageMb: 250,
      documentMb: 100,
      audioMb: 1000,
    },
    retentionDaysByClass: {
      default: 365,
      finance: 2555,
      legal_hold: 36500,
    },
    legalHoldDefault: false,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

function roleKeyFromUserRole(role?: UserRole): keyof StoragePolicy['roleScopeMap'] {
  switch (role) {
    case 'ADMIN':
      return 'ADMIN';
    case 'PROJECT_MANAGER':
      return 'PROJECT_MANAGER';
    case 'CLIENT':
      return 'CLIENT';
    default:
      return 'STAFF';
  }
}

export function canIssueDeliveryLinkByPolicy(policy: StoragePolicy, role?: UserRole): boolean {
  return policy.roleScopeMap[roleKeyFromUserRole(role)].canIssueDeliveryLinks;
}

export async function getStoragePolicy(tenantId?: string): Promise<StoragePolicy> {
  const fn = httpsCallable<GetStoragePolicyInput, StoragePolicy>(
    getFirebaseFunctionsInstance(),
    'getStoragePolicy'
  );
  const result = await fn({ tenantId });
  return result.data;
}

export async function setStoragePolicy(policy: StoragePolicy): Promise<StoragePolicy> {
  const fn = httpsCallable<SetStoragePolicyInput, StoragePolicy>(
    getFirebaseFunctionsInstance(),
    'setStoragePolicy'
  );
  const result = await fn({ policy });
  return result.data;
}
