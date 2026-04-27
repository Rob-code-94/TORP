/**
 * Pure predicate for the FirebaseMisconfiguredBanner. Extracted so it can be
 * unit tested in the node-based vitest setup without spinning up a DOM.
 *
 * The banner only shows when Firebase web config is missing AND we're on a
 * hosted production-ish domain. We don't want it to flash up on localhost,
 * preview deploys at *.workers.dev, custom dev domains, etc., because those
 * are expected to run in mock/demo mode.
 */
const HOSTED_DOMAIN_SUFFIXES = [
  '.run.app',
  '.web.app',
  '.firebaseapp.com',
];

export function isHostedProductionLikeHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  return HOSTED_DOMAIN_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

export function shouldShowMisconfiguredBanner(args: {
  isConfigured: boolean;
  hostname: string | null | undefined;
  dismissed: boolean;
}): boolean {
  if (args.isConfigured) return false;
  if (args.dismissed) return false;
  return isHostedProductionLikeHost(args.hostname);
}
