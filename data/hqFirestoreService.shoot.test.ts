import { describe, expect, it } from 'vitest';
import { omitUndefinedRecord } from './hqFirestoreService';

describe('omitUndefinedRecord for project upsert payloads', () => {
  it('removes projectCode and other undefined optional fields', () => {
    const payload = omitUndefinedRecord({
      tenantId: 'tenant-1',
      title: 'BOOTSTRAP PROJECT',
      clientId: 'client-bootstrap',
      projectCode: undefined,
      startDate: undefined,
      location: undefined,
      priority: undefined,
      riskLevel: undefined,
      sourceChannel: undefined,
    });

    expect(payload).not.toHaveProperty('projectCode');
    expect(payload).not.toHaveProperty('startDate');
    expect(payload).not.toHaveProperty('location');
    expect(payload).not.toHaveProperty('priority');
    expect(payload).not.toHaveProperty('riskLevel');
    expect(payload).not.toHaveProperty('sourceChannel');
    expect(payload.title).toBe('BOOTSTRAP PROJECT');
  });
});

describe('omitUndefinedRecord for shoot upsert payloads', () => {
  it('removes gearItems and other undefined optional fields', () => {
    const payload = omitUndefinedRecord({
      tenantId: 'tenant-1',
      projectId: 'proj-1',
      title: 'Bootstrap shoot',
      date: '2026-05-18',
      callTime: '08:00',
      location: 'Studio A',
      crewIds: ['crew-1'],
      gearItems: undefined,
      endTime: undefined,
      description: undefined,
    });

    expect(payload).not.toHaveProperty('gearItems');
    expect(payload).not.toHaveProperty('endTime');
    expect(payload).not.toHaveProperty('description');
    expect(payload.tenantId).toBe('tenant-1');
    expect(payload.title).toBe('Bootstrap shoot');
  });

  it('keeps defined optional fields', () => {
    const payload = omitUndefinedRecord({
      tenantId: 'tenant-1',
      gearItems: ['camera', 'lens'],
      gearSummary: '2 bodies',
    });

    expect(payload.gearItems).toEqual(['camera', 'lens']);
    expect(payload.gearSummary).toBe('2 bodies');
  });
});
