import { courseflowNavItems } from '../config/courseflowNavigation';

export const HOME_MODULE_VISIBILITY_KEY = 'courseflow_home_hidden_modules';

const validHomeModuleIds = new Set(courseflowNavItems.map((module) => module.id));

export function sanitizeHiddenCourseflowModuleIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === 'string' && validHomeModuleIds.has(item),
  );
}

export function loadHiddenCourseflowModuleIds(): string[] {
  try {
    const raw = window.localStorage.getItem(HOME_MODULE_VISIBILITY_KEY);
    if (!raw) {
      return [];
    }
    return sanitizeHiddenCourseflowModuleIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveHiddenCourseflowModuleIds(hiddenModuleIds: string[]): void {
  window.localStorage.setItem(
    HOME_MODULE_VISIBILITY_KEY,
    JSON.stringify(sanitizeHiddenCourseflowModuleIds(hiddenModuleIds)),
  );
}
