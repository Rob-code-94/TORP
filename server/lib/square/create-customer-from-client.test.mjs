import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCreateCustomerBody } from './create-customer-from-client.mjs';

describe('buildCreateCustomerBody', () => {
  it('rejects quick-add emails', () => {
    const r = buildCreateCustomerBody(
      {
        company: 'Pepsi',
        name: 'Test',
        email: 'quick-abc@quick-add.local',
        billingEmail: 'quick-abc@quick-add.local',
      },
      'cl-1',
    );
    assert.ok(r.error);
    assert.equal(r.body, undefined);
  });

  it('builds create payload for real email', () => {
    const r = buildCreateCustomerBody(
      {
        company: 'Kingdom Image Arts',
        name: 'Ramani Hunter',
        email: 'rhunter@kiarts.live',
        billingEmail: 'rhunter@kiarts.live',
        addressCity: 'Columbus',
        addressState: 'OH',
        addressPostal: '43215',
        addressCountry: 'US',
      },
      'cl-2',
    );
    assert.ok(r.body);
    assert.equal(r.body.emailAddress, 'rhunter@kiarts.live');
    assert.equal(r.body.companyName, 'Kingdom Image Arts');
    assert.equal(r.body.idempotencyKey, 'torp-client-cl-2');
  });
});
