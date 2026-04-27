const KEY = 'torp:hqGuideTipDismissed';

export function isHqGuideTipDismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
}

export function dismissHqGuideTip(): void {
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    // ignore
  }
}

export const HQ_GUIDE_TIP_RESET_EVENT = 'torp:hqGuideTipReset';

export function resetHqGuideTip(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(HQ_GUIDE_TIP_RESET_EVENT));
}

export const HQ_GUIDE_TIP_EVENT = 'torp:openProductGuide';

export function dispatchOpenProductGuide(): void {
  window.dispatchEvent(new CustomEvent(HQ_GUIDE_TIP_EVENT));
}
