/**
 * Haptic feedback utility using the Web Vibration API.
 * Silently no-ops on browsers/devices that don't support it.
 */
export const haptic = (ms: number = 20): void => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {}
};

export const hapticLight  = () => haptic(12);
export const hapticMedium = () => haptic(25);
export const hapticStrong = () => haptic(45);
