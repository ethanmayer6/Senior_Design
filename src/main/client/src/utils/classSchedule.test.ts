import { describe, expect, it } from 'vitest';
import { getCurrentDayCode, getScheduleWeekStart, parseScheduleDate } from './classSchedule';

describe('classSchedule utilities', () => {
  it('parses YYYY-MM-DD schedule dates as local dates', () => {
    const parsed = parseScheduleDate('2026-04-08');

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(8);
    expect(getCurrentDayCode(parsed as Date)).toBe('W');
  });

  it('returns the Monday-start week for a midweek date', () => {
    const start = getScheduleWeekStart(new Date(2026, 3, 8, 18, 45));

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(3);
    expect(start.getDate()).toBe(6);
    expect(getCurrentDayCode(start)).toBe('M');
  });

  it('returns the previous Monday when the reference date is Sunday', () => {
    const start = getScheduleWeekStart(new Date(2026, 3, 12, 9, 15));

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(3);
    expect(start.getDate()).toBe(6);
    expect(getCurrentDayCode(start)).toBe('M');
  });
});
