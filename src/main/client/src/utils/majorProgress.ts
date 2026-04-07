import type { Major } from '../api/majorsApi';
import type { Flowchart } from '../api/flowchartApi';
import {
  createStatusLookup,
  normalizeCourseIdent,
  normalizeStatus,
  resolveCourseStatus,
} from './flowchartStatus';

export const MAJORS_BROWSE_SELECTED_MAJOR_ID_STORAGE_KEY = 'courseflow:majorsBrowse:selectedMajorId';

export interface MajorRequirementProgress {
  totalSlots: number;
  completedSlots: number;
  inProgressSlots: number;
  remainingSlots: number;
  completedMatches: string[];
  inProgressMatches: string[];
}

export interface MajorRequirementEntry extends MajorRequirementProgress {
  requirementId: number;
  name: string;
  status: 'SATISFIED' | 'IN_PROGRESS' | 'UNMET';
}

export interface MajorProgressSnapshot {
  completedCourseIdents: Set<string>;
  inProgressCourseIdents: Set<string>;
  requirementProgressById: Map<number, MajorRequirementProgress>;
  requirementEntries: MajorRequirementEntry[];
  overallRequirementProgress: {
    total: number;
    completed: number;
    inProgress: number;
    inProgressOnly: number;
    unmet: number;
  };
  strictViewCounts: {
    total: number;
    satisfied: number;
    inProgress: number;
    unmet: number;
  };
}

export function persistMajorsBrowseSelectedMajorId(majorId: number | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (majorId === null || !Number.isFinite(majorId) || majorId <= 0) {
    window.localStorage.removeItem(MAJORS_BROWSE_SELECTED_MAJOR_ID_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(MAJORS_BROWSE_SELECTED_MAJOR_ID_STORAGE_KEY, String(majorId));
}

export function loadMajorsBrowseSelectedMajorId(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const rawValue = window.localStorage.getItem(MAJORS_BROWSE_SELECTED_MAJOR_ID_STORAGE_KEY);
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function buildMajorProgress(
  major: Major | null,
  flowchart: Flowchart | null
): MajorProgressSnapshot {
  const completedCourseIdents = new Set<string>();
  const inProgressCourseIdents = new Set<string>();
  const statusLookup = createStatusLookup(flowchart?.courseStatusMap);

  statusLookup.forEach((rawStatus, ident) => {
    const status = normalizeStatus(rawStatus);
    if (status === 'COMPLETED') {
      completedCourseIdents.add(ident);
      inProgressCourseIdents.delete(ident);
      return;
    }
    if (status === 'IN_PROGRESS' && !completedCourseIdents.has(ident)) {
      inProgressCourseIdents.add(ident);
    }
  });

  (flowchart?.semesters ?? []).forEach((semester) => {
    (semester.courses ?? []).forEach((course) => {
      const normalizedIdent = normalizeCourseIdent(course.courseIdent);
      if (!normalizedIdent) return;
      const status = normalizeStatus(resolveCourseStatus(statusLookup, course.courseIdent));
      if (status === 'COMPLETED') {
        completedCourseIdents.add(normalizedIdent);
        inProgressCourseIdents.delete(normalizedIdent);
        return;
      }
      if (status === 'IN_PROGRESS' && !completedCourseIdents.has(normalizedIdent)) {
        inProgressCourseIdents.add(normalizedIdent);
      }
    });
  });

  const requirementProgressById = new Map<number, MajorRequirementProgress>();
  const requirements = major?.degreeRequirements ?? [];

  requirements.forEach((requirement) => {
    const directCourses = requirement.courses ?? [];
    const groups = requirement.requirementGroups ?? [];
    let completedSlots = 0;
    let inProgressSlots = 0;
    const completedMatches: string[] = [];
    const inProgressMatches: string[] = [];

    directCourses.forEach((course) => {
      const normalized = normalizeCourseIdent(course.courseIdent);
      if (!normalized) return;
      if (completedCourseIdents.has(normalized)) {
        completedSlots += 1;
        completedMatches.push(course.courseIdent);
        return;
      }
      if (inProgressCourseIdents.has(normalized)) {
        inProgressSlots += 1;
        inProgressMatches.push(course.courseIdent);
      }
    });

    groups.forEach((group) => {
      const groupCourses = group.courses ?? [];
      const completedGroupCourse = groupCourses.find((course) =>
        completedCourseIdents.has(normalizeCourseIdent(course.courseIdent))
      );
      if (completedGroupCourse) {
        completedSlots += 1;
        completedMatches.push(completedGroupCourse.courseIdent);
        return;
      }
      const inProgressGroupCourse = groupCourses.find((course) =>
        inProgressCourseIdents.has(normalizeCourseIdent(course.courseIdent))
      );
      if (inProgressGroupCourse) {
        inProgressSlots += 1;
        inProgressMatches.push(inProgressGroupCourse.courseIdent);
      }
    });

    const totalSlots = directCourses.length + groups.length;
    const remainingSlots = Math.max(totalSlots - completedSlots - inProgressSlots, 0);

    requirementProgressById.set(requirement.id, {
      totalSlots,
      completedSlots,
      inProgressSlots,
      remainingSlots,
      completedMatches,
      inProgressMatches,
    });
  });

  const requirementEntries = requirements.map((requirement) => {
    const progress = requirementProgressById.get(requirement.id) ?? {
      totalSlots: 0,
      completedSlots: 0,
      inProgressSlots: 0,
      remainingSlots: 0,
      completedMatches: [],
      inProgressMatches: [],
    };

    let status: 'SATISFIED' | 'IN_PROGRESS' | 'UNMET' = 'UNMET';
    if (progress.totalSlots === 0 || progress.completedSlots >= progress.totalSlots) {
      status = 'SATISFIED';
    } else if (progress.completedSlots > 0 || progress.inProgressSlots > 0) {
      status = 'IN_PROGRESS';
    }

    return {
      requirementId: requirement.id,
      name: requirement.name,
      status,
      ...progress,
    };
  });

  const strictViewCounts = requirementEntries.reduce(
    (counts, entry) => {
      if (entry.status === 'SATISFIED') {
        counts.satisfied += 1;
      } else if (entry.status === 'IN_PROGRESS') {
        counts.inProgress += 1;
      } else {
        counts.unmet += 1;
      }
      return counts;
    },
    { total: requirementEntries.length, satisfied: 0, inProgress: 0, unmet: 0 }
  );

  const overallRequirementProgress = {
    total: requirementEntries.length,
    completed: strictViewCounts.satisfied,
    inProgress: strictViewCounts.inProgress,
    inProgressOnly: strictViewCounts.inProgress,
    unmet: strictViewCounts.unmet,
  };

  return {
    completedCourseIdents,
    inProgressCourseIdents,
    requirementProgressById,
    requirementEntries,
    overallRequirementProgress,
    strictViewCounts,
  };
}
