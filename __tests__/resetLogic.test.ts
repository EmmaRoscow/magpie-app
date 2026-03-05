import { shouldReset, RESET_HOUR } from '../src/utils/resetLogic';

function makeDate(dateStr: string, hour: number, minute = 0): Date {
  const d = new Date(dateStr);
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe('shouldReset', () => {
  describe('when reset is needed', () => {
    it('returns true when last reset was yesterday before 3am, now is past 3am today', () => {
      const lastReset = makeDate('2024-01-15', 2, 30);
      const now = makeDate('2024-01-16', 9, 0);
      expect(shouldReset(lastReset.toISOString(), now)).toBe(true);
    });

    it('returns true when last reset was yesterday before 3am and now is before 3am today', () => {
      // lastReset = 2am yesterday (before yesterday's 3am boundary)
      // now = 1am today (before today's 3am); boundary = yesterday 3am
      // lastReset (2am yesterday) < boundary (3am yesterday) → reset needed
      const lastReset = makeDate('2024-01-15', 2, 0);
      const now = makeDate('2024-01-16', 1, 0);
      expect(shouldReset(lastReset.toISOString(), now)).toBe(true);
    });

    it('returns true when multiple days have passed', () => {
      const lastReset = makeDate('2024-01-10', 10, 0);
      const now = makeDate('2024-01-16', 10, 0);
      expect(shouldReset(lastReset.toISOString(), now)).toBe(true);
    });

    it('returns true when last reset is epoch (never set)', () => {
      const epoch = new Date(0).toISOString();
      const now = makeDate('2024-01-16', 10, 0);
      expect(shouldReset(epoch, now)).toBe(true);
    });

    it('returns true 1ms after 3am when last reset was 1ms before 3am', () => {
      const boundary = makeDate('2024-01-16', RESET_HOUR, 0);
      const lastReset = new Date(boundary.getTime() - 1);
      const now = new Date(boundary.getTime() + 1);
      expect(shouldReset(lastReset.toISOString(), now)).toBe(true);
    });
  });

  describe('when reset is not needed', () => {
    it('returns false when last reset was after 3am today and now is later the same day', () => {
      const lastReset = makeDate('2024-01-16', 3, 1);
      const now = makeDate('2024-01-16', 9, 0);
      expect(shouldReset(lastReset.toISOString(), now)).toBe(false);
    });

    it('returns false when last reset was yesterday after 3am and now is before 3am today', () => {
      const lastReset = makeDate('2024-01-15', 3, 5);
      const now = makeDate('2024-01-16', 2, 59);
      expect(shouldReset(lastReset.toISOString(), now)).toBe(false);
    });

    it('returns false when last reset is exactly at the 3am boundary', () => {
      const boundary = makeDate('2024-01-16', RESET_HOUR, 0);
      const now = makeDate('2024-01-16', RESET_HOUR, 0);
      // lastReset === boundary: not strictly less than, so no reset
      expect(shouldReset(boundary.toISOString(), now)).toBe(false);
    });
  });
});
