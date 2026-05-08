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

  it('firestore.rules allows public read for landing showcase and portfolio CMS', () => {
    const s = readRules('firestore.rules');
    expect(s).toContain('/tenants/{tid}/showcase/{docId}');
    expect(s).toContain('/tenants/{tid}/portfolioProjects/{docId}');
    expect(s).toMatch(/showcase\/\{docId\}[\s\S]*?allow\s+read:\s*if\s+true/);
    expect(s).toMatch(/portfolioProjects\/\{docId\}[\s\S]*?allow\s+read:\s*if\s+true/);
  });

  it('storage.rules enforces tenant path', () => {
    const s = readRules('storage.rules');
    expect(s).toContain('tenantId');
    expect(s).toMatch(/allow\s+read,\s*write:\s*if false/);
  });

  it('storage.rules allows public read for landing showcase and portfolio objects', () => {
    const s = readRules('storage.rules');
    expect(s).toContain('public/showcase');
    expect(s).toContain('public/portfolio');
    expect(s).toMatch(/public\/showcase\/\{allPaths=\*\*\}[\s\S]*?allow\s+read:\s*if\s+true/);
    expect(s).toMatch(/public\/portfolio\/\{allPaths=\*\*\}[\s\S]*?allow\s+read:\s*if\s+true/);
  });
});
