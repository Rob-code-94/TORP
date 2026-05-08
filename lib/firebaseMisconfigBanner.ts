export function isHostedProductionLikeHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  return lower !== 'localhost' && lower !== '127.0.0.1' && lower !== '::1';
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
