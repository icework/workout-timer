/**
 * Screen Wake Lock utility.
 * Uses the Screen Wake Lock API to prevent the device from sleeping during workouts.
 *
 * Supported: Chrome Android (84+), iOS Safari (16.4+), modern desktop browsers.
 * Falls back gracefully on unsupported browsers (no-op).
 */

let wakeLock: WakeLockSentinel | null = null;

/**
 * Request a screen wake lock.
 * Call this when the workout starts or resumes.
 * Returns the sentinel for later release, or null if unsupported/denied.
 */
export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (!('wakeLock' in navigator)) {
    return null;
  }

  try {
    wakeLock = await navigator.wakeLock.request('screen');
    return wakeLock;
  } catch (err) {
    // User denied, unsupported, or another error — treat as non-fatal
    console.warn('[ScreenWakeLock] Failed to acquire wake lock:', err);
    wakeLock = null;
    return null;
  }
}

/**
 * Release the current screen wake lock.
 * Call this when the workout is paused, finished, or unmounts.
 */
export async function releaseWakeLock(): Promise<void> {
  if (wakeLock) {
    try {
      await wakeLock.release();
    } catch (err) {
      console.warn('[ScreenWakeLock] Failed to release wake lock:', err);
    }
    wakeLock = null;
  }
}

/**
 * Re-acquire wake lock if the page became visible again.
 * The wake lock is automatically released when the tab goes to background,
 * so this must be called on `visibilitychange` when the document is visible.
 */
export async function reacquireWakeLock(): Promise<WakeLockSentinel | null> {
  // Only re-acquire if the document is actually visible
  if (!document.hidden) {
    return requestWakeLock();
  }
  return null;
}
