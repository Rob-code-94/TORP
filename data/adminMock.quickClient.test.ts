import { describe, expect, it } from 'vitest';
import { createClient } from './adminProjectsApi';
import { EMPTY_CLIENT_PROFILE_DRAFT } from '../components/hq/admin/ClientProfileForm';

describe('createClient quick mode', () => {
  const uniq = () => `qa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  it('succeeds with only primary contact', () => {
    const id = uniq();
    const r = createClient(
      {
        ...EMPTY_CLIENT_PROFILE_DRAFT,
        name: id,
        company: '',
      },
      { quick: true },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.client.name).toBe(id);
      expect(r.client.company).toBe(id);
      expect(r.client.email.endsWith('@quick-add.local')).toBe(true);
    }
  });

  it('succeeds with only company', () => {
    const id = uniq();
    const r = createClient(
      {
        ...EMPTY_CLIENT_PROFILE_DRAFT,
        company: id,
        name: '',
      },
      { quick: true },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.client.company).toBe(id);
      expect(r.client.name).toBe(id);
    }
  });

  it('fails when company and name are both empty', () => {
    const r = createClient({ ...EMPTY_CLIENT_PROFILE_DRAFT }, { quick: true });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/company name or primary contact/i);
    }
  });

  it('non-quick rejects empty draft', () => {
    const r = createClient({ ...EMPTY_CLIENT_PROFILE_DRAFT });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.length).toBeGreaterThan(0);
    }
  });
});
