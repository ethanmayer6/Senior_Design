import { describe, expect, it } from 'vitest';
import { createStatusLookup, normalizeCourseIdent, normalizeStatus, resolveCourseStatus } from './flowchartStatus';

describe('flowchart status utilities', () => {
  it('normalizes course idents by stripping punctuation and casing differences', () => {
    expect(normalizeCourseIdent(' com s-2270 ')).toBe('COMS2270');
    expect(normalizeCourseIdent('SE_4170')).toBe('SE4170');
  });

  it('normalizes status values into backend-style enum keys', () => {
    expect(normalizeStatus('in progress')).toBe('IN_PROGRESS');
    expect(normalizeStatus('not-started')).toBe('NOT_STARTED');
  });

  it('builds and resolves a status lookup using normalized keys', () => {
    const lookup = createStatusLookup({
      'com s 2270': 'COMPLETED',
      'SE-4170': 'IN_PROGRESS',
    });

    expect(resolveCourseStatus(lookup, 'COMS_2270')).toBe('COMPLETED');
    expect(resolveCourseStatus(lookup, 'se 4170')).toBe('IN_PROGRESS');
    expect(resolveCourseStatus(lookup, 'MATH_2670')).toBeUndefined();
  });
});
