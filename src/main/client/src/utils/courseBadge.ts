import type { Course } from '../types/course';

export function normalizeBadgeCourseIdentInput(value: string | null | undefined): string {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) {
    return '';
  }

  const collapsed = raw.replace(/[\s_-]+/g, '');
  const compactMatch = collapsed.match(/^([A-Z]{2,8})(\d{4}[A-Z]?)$/);
  if (compactMatch) {
    return `${compactMatch[1]}_${compactMatch[2]}`;
  }

  return raw.replace(/[\s-]+/g, '_').replace(/_+/g, '_');
}

export function formatBadgeCourseIdent(courseIdent: string | null | undefined): string {
  return normalizeBadgeCourseIdentInput(courseIdent).replace(/_/g, ' ').trim();
}

export function buildBadgePreviewCourse(courseIdent: string | null | undefined): Course | null {
  const normalized = normalizeBadgeCourseIdentInput(courseIdent);
  if (!/^[A-Z]{2,8}_\d{4}[A-Z]?$/.test(normalized)) {
    return null;
  }

  return {
    courseIdent: normalized,
    name: formatBadgeCourseIdent(normalized),
    credits: 0,
    prerequisites: [],
    description: '',
    offered: '',
  };
}
