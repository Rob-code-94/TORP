const PRESERVED_BILLING_KEYS = ['contractSigned', 'contractSignedAt', 'contractNotes'];

export function mergeBillingForFirestore(existing, squarePatch) {
  const prev = existing && typeof existing === 'object' ? { ...existing } : {};
  const preserved = {};
  for (const k of PRESERVED_BILLING_KEYS) {
    if (k in prev) preserved[k] = prev[k];
  }
  const merged = { ...prev, ...squarePatch, ...preserved };
  return Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined));
}
