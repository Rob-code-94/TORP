import type { CrewProfile } from '../types';

export type CrewCraftRole = CrewProfile['role'];

export const CREW_CRAFT_ROLES: { value: CrewCraftRole; label: string }[] = [
  { value: 'director', label: 'Director' },
  { value: 'dp', label: 'DP' },
  { value: 'editor', label: 'Editor' },
  { value: 'producer', label: 'Producer' },
  { value: 'audio', label: 'Audio' },
  { value: 'photography', label: 'General photography' },
  { value: 'other', label: 'Other' },
];

const LABEL_BY_VALUE = Object.fromEntries(CREW_CRAFT_ROLES.map((r) => [r.value, r.label])) as Record<
  CrewCraftRole,
  string
>;

export function formatCrewCraftRole(role: string | undefined | null): string {
  if (!role) return '—';
  return LABEL_BY_VALUE[role as CrewCraftRole] ?? role;
}
