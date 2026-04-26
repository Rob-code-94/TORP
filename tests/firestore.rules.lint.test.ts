import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const readRules = (name: string) => readFileSync(path.join(root, name), 'utf8');

describe('Security rules (lint)', () => {
  it('firestore.rules requires tenant and denies by default', () => {
    const s = readRules('firestore.rules');
    expect(s).toContain('request.auth');
    expect(s).toContain('tenantId');
    expect(s).toMatch(/allow\s+read,\s*write:\s*if false/);
  });

  it('storage.rules enforces tenant path', () => {
    const s = readRules('storage.rules');
    expect(s).toContain('tenantId');
    expect(s).toMatch(/allow\s+read,\s*write:\s*if false/);
  });
});
