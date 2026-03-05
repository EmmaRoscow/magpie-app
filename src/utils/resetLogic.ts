export const RESET_HOUR = 3; // 3am

/**
 * Returns true if a reset should be applied.
 *
 * Computes the most recent "3am boundary" relative to `now`:
 * - If now >= today at 3am  → boundary = today at 3am
 * - If now <  today at 3am  → boundary = yesterday at 3am
 *
 * A reset is needed if lastResetDate < that boundary.
 *
 * The `now` parameter is injectable for deterministic testing.
 */
export function shouldReset(lastResetISO: string, now: Date = new Date()): boolean {
  const lastReset = new Date(lastResetISO);

  const boundary = new Date(now);
  boundary.setHours(RESET_HOUR, 0, 0, 0);
  boundary.setSeconds(0);
  boundary.setMilliseconds(0);

  if (now < boundary) {
    // Before today's 3am — use yesterday's 3am as the boundary
    boundary.setDate(boundary.getDate() - 1);
  }

  return lastReset < boundary;
}
