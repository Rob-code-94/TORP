import { describe, expect, it } from 'vitest';
import { hqUserGreetingName, hqUserInitials } from './hqUserDisplay';

describe('hqUserInitials', () => {
  it('uses first and last name tokens', () => {
    expect(hqUserInitials({ displayName: 'Jayden Price', email: 'jp@torp.life' })).toBe('JP');
  });

  it('does not use role — PM-style project manager name still yields initials', () => {
    expect(hqUserInitials({ displayName: 'Jayden Price', email: undefined })).toBe('JP');
  });

  it('handles two short tokens like ROB R', () => {
    expect(hqUserInitials({ displayName: 'ROB R', email: undefined })).toBe('RR');
  });

  it('uses email local-part when no displayName', () => {
    expect(hqUserInitials({ displayName: undefined, email: 'jp@torp.life' })).toBe('JP');
  });

  it('single-word displayName uses first two alphanumerics', () => {
    expect(hqUserInitials({ displayName: 'Admin', email: undefined })).toBe('AD');
  });

  it('returns ellipsis for null user', () => {
    expect(hqUserInitials(null)).toBe('…');
  });

  it('falls back to HQ when no usable identity', () => {
    expect(hqUserInitials({ displayName: '   ', email: undefined })).toBe('HQ');
  });
});

describe('hqUserGreetingName', () => {
  it('uses first word of display name', () => {
    expect(hqUserGreetingName({ displayName: 'Jayden Price', email: 'jp@torp.life' })).toBe('Jayden');
  });

  it('keeps first token as-is (e.g. all caps)', () => {
    expect(hqUserGreetingName({ displayName: 'ROB R', email: undefined })).toBe('ROB');
  });

  it('title-cases first segment of email local-part when no displayName', () => {
    expect(hqUserGreetingName({ displayName: undefined, email: 'jp@torp.life' })).toBe('Jp');
    expect(hqUserGreetingName({ displayName: undefined, email: 'william.fairbanks@torp.life' })).toBe('William');
  });

  it('returns there when no user', () => {
    expect(hqUserGreetingName(null)).toBe('there');
  });
});
