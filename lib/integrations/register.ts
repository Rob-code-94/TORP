import { registerGoogleCalendarIntegration } from '../../components/hq/settings/integrations/GoogleCalendarCard';
import { registerAppleSubscribeIntegration } from '../../components/hq/settings/integrations/AppleSubscribeCard';

let registered = false;

/**
 * Idempotent registration of every shipped integration card.
 *
 * Call this once from `IntegrationsPage` before rendering. Future integrations
 * are added by exporting their own `registerXxx` function from
 * `components/hq/settings/integrations/<Name>Card.tsx` and calling it here.
 */
export function ensureIntegrationsRegistered() {
  if (registered) return;
  registered = true;
  registerGoogleCalendarIntegration();
  registerAppleSubscribeIntegration();
}
