import { describe, expect, it } from 'vitest';
import { getBadgeColors } from './colorUtils';

describe('badge color utilities', () => {
  it('returns deterministic hex colors for a course badge', () => {
    const colors = getBadgeColors({
      name: 'Senior Design',
      courseIdent: 'SE 4910',
      credits: 3,
      prerequisites: [],
      description: 'desc',
      offered: 'Spring',
    });

    expect(colors.designColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.medalColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.ribbonColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(getBadgeColors({
      name: 'Senior Design',
      courseIdent: 'SE 4910',
      credits: 3,
      prerequisites: [],
      description: 'desc',
      offered: 'Spring',
    })).toEqual(colors);
  });

  it('uses the course prefix and number segments to vary badge colors', () => {
    const first = getBadgeColors({
      name: 'Algorithms',
      courseIdent: 'COMS 3110',
      credits: 3,
      prerequisites: [],
      description: 'desc',
      offered: 'Fall',
    });
    const second = getBadgeColors({
      name: 'Senior Design',
      courseIdent: 'SE 4915',
      credits: 3,
      prerequisites: [],
      description: 'desc',
      offered: 'Spring',
    });

    expect(first.designColor).not.toBe(second.designColor);
    expect(first.ribbonColor).not.toBe(second.ribbonColor);
  });
});
