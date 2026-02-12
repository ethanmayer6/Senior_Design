import type { CourseStatus } from '../api/flowchartApi';

export function normalizeCourseIdent(ident: string | undefined | null): string {
  return String(ident ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function normalizeStatus(status: CourseStatus | undefined | null): string {
  return String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function createStatusLookup(
  courseStatusMap: Record<string, CourseStatus> | undefined
): Map<string, CourseStatus> {
  const lookup = new Map<string, CourseStatus>();
  Object.entries(courseStatusMap ?? {}).forEach(([ident, status]) => {
    const normalizedIdent = normalizeCourseIdent(ident);
    if (!normalizedIdent) return;
    lookup.set(normalizedIdent, status);
  });
  return lookup;
}

export function resolveCourseStatus(
  lookup: Map<string, CourseStatus>,
  courseIdent: string | undefined
): CourseStatus | undefined {
  const normalizedIdent = normalizeCourseIdent(courseIdent);
  if (!normalizedIdent) return undefined;
  return lookup.get(normalizedIdent);
}
