import type { Flowchart, Semester } from '../api/flowchartApi';
import { createStatusLookup, normalizeCourseIdent, normalizeStatus } from './flowchartStatus';

type SchedulerTerm = 'SPRING' | 'SUMMER' | 'FALL';
type ParsedTerm = { term: SchedulerTerm; year: number };
type StrategyId = 'balanced' | 'acceleration' | 'light';
type DeliveryPreference = 'Any' | 'In Person' | 'Online' | 'Hybrid';
type DeliveryMode = 'IN_PERSON' | 'ONLINE' | 'HYBRID' | 'UNKNOWN';

export type SchedulerCourse = {
  id: number;
  courseIdent: string;
  name: string;
  credits: number;
  description?: string;
  hours?: string;
  offered?: string;
  prerequisites?: string[];
  prereq_txt?: string;
};

export type SchedulerRequirementGroup = {
  id: number;
  name: string;
  satisfyingCredits: number;
  courses: SchedulerCourse[];
};

export type SchedulerRequirement = {
  id: number;
  name: string;
  satisfyingCredits: number;
  courses: SchedulerCourse[];
  requirementGroups: SchedulerRequirementGroup[];
};

export type SchedulerMajor = {
  id: number;
  name: string;
  degreeRequirements: SchedulerRequirement[];
};

type RequirementReason = {
  key: string;
  label: string;
  kind: 'direct' | 'group';
  creditsApplied: number;
};

type CandidateCourse = {
  course: SchedulerCourse;
  normalizedIdent: string;
  reasons: RequirementReason[];
  unlockCount: number;
  prereqOk: boolean;
  coreqOk: boolean;
  deliveryOk: boolean;
  offeredOk: boolean;
  validCredits: boolean;
  plannedElsewhere: boolean;
};

type CandidatePoolSnapshot = {
  candidates: CandidateCourse[];
  blockedCount: number;
  invalidCreditCount: number;
  plannedElsewhereCount: number;
  deliveryMismatchCount: number;
};

type RequirementState = {
  unmetDirectCount: number;
  unmetGroupCount: number;
  remainingGroupCredits: number;
};

type StrategyConfig = {
  id: StrategyId;
  title: string;
  summary: string;
  creditLimit: number;
  maxClasses: number;
};

type CappedCourseSelection<T extends Pick<SchedulerCourse, 'credits'>> = {
  courses: T[];
  totalCredits: number;
  skippedCount: number;
};

type ScheduledContext = {
  completed: Set<string>;
  inProgress: Set<string>;
  priorScheduled: Map<string, SchedulerCourse>;
  lockedTarget: Map<string, SchedulerCourse>;
  laterScheduled: Map<string, SchedulerCourse>;
  scheduledAnywhere: Set<string>;
};

export type SchedulerDraftCourse = SchedulerCourse & {
  rationale: string;
  reasonLabels: string[];
  unlockCount: number;
};

export type DraftOption = {
  id: string;
  title: string;
  summary: string;
  projectedCredits: number;
  lockedCredits: number;
  recommendedCredits: number;
  lockedCourses: SchedulerDraftCourse[];
  recommendedCourses: SchedulerDraftCourse[];
  notes: string;
  blockedCount: number;
  invalidCreditCount: number;
  plannedElsewhereCount: number;
  requirementGain: number;
};

export type SchedulerPlanSummary = {
  requirements: number;
  groupedRequirements: number;
  coursePool: number;
  unmetDirectCount: number;
  unmetGroupCount: number;
  remainingGroupCredits: number;
  lockedTargetCount: number;
  lockedTargetCredits: number;
  plannedElsewhereCount: number;
  blockedCount: number;
  invalidCreditCount: number;
  targetTermIsFuture: boolean;
  usesInProgressForFuture: boolean;
};

export type DraftGenerationResult = {
  options: DraftOption[];
  summary: SchedulerPlanSummary;
};

const TERM_ORDER: SchedulerTerm[] = ['SPRING', 'SUMMER', 'FALL'];
const TERM_RANK: Record<SchedulerTerm, number> = {
  SPRING: 1,
  SUMMER: 2,
  FALL: 3,
};

export function parseSchedulerTerm(value: string): ParsedTerm | null {
  const [rawTerm, rawYear] = value.trim().toUpperCase().split(/\s+/);
  const year = Number(rawYear);
  if (!TERM_ORDER.includes(rawTerm as SchedulerTerm) || !Number.isFinite(year)) {
    return null;
  }
  return { term: rawTerm as SchedulerTerm, year };
}

export function nextSchedulerTerm(value: ParsedTerm): ParsedTerm {
  const index = TERM_ORDER.indexOf(value.term);
  if (index < TERM_ORDER.length - 1) {
    return { term: TERM_ORDER[index + 1], year: value.year };
  }
  return { term: TERM_ORDER[0], year: value.year + 1 };
}

export function buildSchedulerTermOptions(count = 8): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startingTerm: SchedulerTerm = month <= 5 ? 'SPRING' : month <= 8 ? 'SUMMER' : 'FALL';
  const start = { term: startingTerm, year };
  const options: string[] = [];
  let cursor = start;
  for (let index = 0; index < count; index += 1) {
    options.push(`${cursor.term} ${cursor.year}`);
    cursor = nextSchedulerTerm(cursor);
  }
  return options;
}

export function generateDraftOptions(
  majorData: SchedulerMajor | null,
  flowchart: Flowchart | null,
  targetTermRaw: string,
  maxCredits: number,
  preferredMode: DeliveryPreference
): DraftGenerationResult {
  const emptyResult: DraftGenerationResult = {
    options: [],
    summary: {
      requirements: 0,
      groupedRequirements: 0,
      coursePool: 0,
      unmetDirectCount: 0,
      unmetGroupCount: 0,
      remainingGroupCredits: 0,
      lockedTargetCount: 0,
      lockedTargetCredits: 0,
      plannedElsewhereCount: 0,
      blockedCount: 0,
      invalidCreditCount: 0,
      targetTermIsFuture: false,
      usesInProgressForFuture: false,
    },
  };

  if (!majorData) {
    return emptyResult;
  }

  const parsedTargetTerm = parseSchedulerTerm(targetTermRaw);
  if (!parsedTargetTerm) {
    return emptyResult;
  }

  const currentTerm = inferCurrentSchedulerTerm();
  const targetTermIsFuture = compareTerms(parsedTargetTerm, currentTerm) > 0;
  const scheduledContext = buildScheduledContext(flowchart, parsedTargetTerm);
  const completedSet = new Set(scheduledContext.completed);
  const priorScheduledSet = new Set(scheduledContext.priorScheduled.keys());
  const lockedTargetSet = new Set(scheduledContext.lockedTarget.keys());
  const inProgressCoverageSet = targetTermIsFuture ? new Set(scheduledContext.inProgress) : new Set<string>();

  const coverageWithoutTarget = new Set<string>([
    ...completedSet,
    ...priorScheduledSet,
    ...inProgressCoverageSet,
  ]);
  const coverageBaseline = new Set<string>([
    ...coverageWithoutTarget,
    ...lockedTargetSet,
  ]);
  const prereqReadySet = new Set<string>([
    ...completedSet,
    ...scheduledContext.inProgress,
  ]);

  const groupedRequirements = (majorData.degreeRequirements ?? []).reduce(
    (sum, requirement) => sum + (requirement.requirementGroups?.length ?? 0),
    0
  );
  const coursePool = collectUniqueCourses(majorData).size;
  const lockedTargetCourses = Array.from(scheduledContext.lockedTarget.values());
  const lockedTargetCredits = lockedTargetCourses.reduce((sum, course) => sum + courseCredits(course), 0);
  const unlockMap = collectUnlockMap(majorData);
  const requirementState = computeRequirementState(majorData, coverageBaseline);
  const initialCandidatePool = buildCandidatePool(
    majorData,
    coverageBaseline,
    prereqReadySet,
    new Set<string>([...prereqReadySet, ...lockedTargetSet]),
    parsedTargetTerm,
    scheduledContext.laterScheduled,
    scheduledContext.scheduledAnywhere,
    unlockMap,
    preferredMode
  );

  const summary: SchedulerPlanSummary = {
    requirements: majorData.degreeRequirements?.length ?? 0,
    groupedRequirements,
    coursePool,
    unmetDirectCount: requirementState.unmetDirectCount,
    unmetGroupCount: requirementState.unmetGroupCount,
    remainingGroupCredits: requirementState.remainingGroupCredits,
    lockedTargetCount: lockedTargetCourses.length,
    lockedTargetCredits,
    plannedElsewhereCount: initialCandidatePool.plannedElsewhereCount,
    blockedCount: initialCandidatePool.blockedCount,
    invalidCreditCount: initialCandidatePool.invalidCreditCount,
    targetTermIsFuture,
    usesInProgressForFuture: targetTermIsFuture && scheduledContext.inProgress.size > 0,
  };

  const lockedTargetDraftCourses = buildLockedTargetDraftCourses(
    lockedTargetCourses,
    majorData,
    coverageWithoutTarget,
    prereqReadySet,
    parsedTargetTerm,
    scheduledContext.scheduledAnywhere
  );

  const strategies = buildStrategyConfigs(maxCredits);
  const options = strategies.map((strategy) =>
    buildOption({
      strategy,
      majorData,
      parsedTargetTerm,
      coverageBaseline,
      prereqReadySet,
      lockedTargetSet,
      lockedTargetDraftCourses,
      lockedTargetCredits,
      laterScheduled: scheduledContext.laterScheduled,
      scheduledAnywhere: scheduledContext.scheduledAnywhere,
      unlockMap,
      preferredMode,
    })
  );

  return { options, summary };
}

function buildOption(params: {
  strategy: StrategyConfig;
  majorData: SchedulerMajor;
  parsedTargetTerm: ParsedTerm;
  coverageBaseline: Set<string>;
  prereqReadySet: Set<string>;
  lockedTargetSet: Set<string>;
  lockedTargetDraftCourses: SchedulerDraftCourse[];
  lockedTargetCredits: number;
  laterScheduled: Map<string, SchedulerCourse>;
  scheduledAnywhere: Set<string>;
  unlockMap: Map<string, SchedulerCourse[]>;
  preferredMode: DeliveryPreference;
}): DraftOption {
  const {
    strategy,
    majorData,
    parsedTargetTerm,
    coverageBaseline,
    prereqReadySet,
    lockedTargetSet,
    lockedTargetDraftCourses,
    lockedTargetCredits,
    laterScheduled,
    scheduledAnywhere,
    unlockMap,
    preferredMode,
  } = params;

  const initialPool = buildCandidatePool(
    majorData,
    coverageBaseline,
    prereqReadySet,
    lockedTargetSet,
    parsedTargetTerm,
    laterScheduled,
    scheduledAnywhere,
    unlockMap,
    preferredMode
  );
  const selectedCourses: SchedulerDraftCourse[] = [];
  const selectedIdents = new Set<string>();
  const coverageAfterSelections = new Set<string>(coverageBaseline);
  const coreqReadySet = new Set<string>([...prereqReadySet, ...lockedTargetSet]);
  const departmentCounts = new Map<string, number>();
  const creditLimit = sanitizeSchedulerCreditLimit(strategy.creditLimit);
  const remainingCreditBudget = Math.max(0, creditLimit - lockedTargetCredits);
  let recommendedCredits = 0;

  while (selectedCourses.length < strategy.maxClasses && recommendedCredits < remainingCreditBudget) {
    const candidatePool = buildCandidatePool(
      majorData,
      coverageAfterSelections,
      prereqReadySet,
      coreqReadySet,
      parsedTargetTerm,
      laterScheduled,
      scheduledAnywhere,
      unlockMap,
      preferredMode
    );
    const eligible = candidatePool.candidates
      .filter((candidate) => !selectedIdents.has(candidate.normalizedIdent))
      .filter((candidate) => !candidate.plannedElsewhere)
      .filter((candidate) => candidate.prereqOk && candidate.coreqOk && candidate.deliveryOk && candidate.offeredOk && candidate.validCredits)
      .filter((candidate) => recommendedCredits + courseCredits(candidate.course) <= remainingCreditBudget)
      .map((candidate) => ({
        candidate,
        score: scoreCandidate(candidate, strategy.id, departmentCounts),
      }))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (right.candidate.unlockCount !== left.candidate.unlockCount) {
          return right.candidate.unlockCount - left.candidate.unlockCount;
        }
        return courseCredits(left.candidate.course) - courseCredits(right.candidate.course);
      });

    if (eligible.length === 0) {
      break;
    }

    const winner = eligible[0].candidate;
    const winnerDepartment = extractDepartmentKey(winner.course.courseIdent);

    selectedCourses.push(candidateToDraftCourse(winner, 'Suggested for this draft because'));
    selectedIdents.add(winner.normalizedIdent);
    coverageAfterSelections.add(winner.normalizedIdent);
    coreqReadySet.add(winner.normalizedIdent);
    recommendedCredits += courseCredits(winner.course);
    departmentCounts.set(winnerDepartment, (departmentCounts.get(winnerDepartment) ?? 0) + 1);
  }

  const cappedSelection = capCoursesToCreditLimit(selectedCourses, remainingCreditBudget);

  return {
    id: strategy.id,
    title: strategy.title,
    summary: strategy.summary,
    projectedCredits: lockedTargetCredits + cappedSelection.totalCredits,
    lockedCredits: lockedTargetCredits,
    recommendedCredits: cappedSelection.totalCredits,
    lockedCourses: lockedTargetDraftCourses,
    recommendedCourses: cappedSelection.courses,
    notes: buildOptionNotes({
      selectedCourses: cappedSelection.courses,
      lockedTargetCredits,
      creditLimit,
      initialPool,
      preferredMode,
      creditCapSkippedCount: cappedSelection.skippedCount,
    }),
    blockedCount: initialPool.blockedCount,
    invalidCreditCount: initialPool.invalidCreditCount,
    plannedElsewhereCount: initialPool.plannedElsewhereCount,
    requirementGain: countRequirementMoves(selectedCourses),
  };
}

function buildStrategyConfigs(maxCredits: number): StrategyConfig[] {
  const clampedCredits = sanitizeSchedulerCreditLimit(maxCredits);
  const balancedLimit = clampedCredits;
  const accelerationLimit = clampedCredits;
  const lightLimit = Math.max(0, Math.min(clampedCredits, clampedCredits - 3));

  return [
    {
      id: 'balanced',
      title: 'Balanced Path',
      summary: 'Keeps steady degree progress while avoiding overloaded drafts.',
      creditLimit: balancedLimit,
      maxClasses: 5,
    },
    {
      id: 'acceleration',
      title: 'Acceleration Path',
      summary: 'Pushes harder on unlocks and total requirement coverage.',
      creditLimit: accelerationLimit,
      maxClasses: 6,
    },
    {
      id: 'light',
      title: 'Light Load Path',
      summary: 'Protects breathing room while still moving requirements forward.',
      creditLimit: lightLimit,
      maxClasses: 4,
    },
  ];
}

function buildOptionNotes(params: {
  selectedCourses: SchedulerDraftCourse[];
  lockedTargetCredits: number;
  creditLimit: number;
  initialPool: CandidatePoolSnapshot;
  preferredMode: DeliveryPreference;
  creditCapSkippedCount: number;
}): string {
  const { selectedCourses, lockedTargetCredits, creditLimit, initialPool, preferredMode, creditCapSkippedCount } = params;
  const notes: string[] = [];

  if (lockedTargetCredits > creditLimit) {
    notes.push(`Your existing target-term plan is already ${lockedTargetCredits - creditLimit} credits above this option's credit target.`);
  }
  if (selectedCourses.length === 0) {
    notes.push('No additional courses fit the current prerequisite, offering, and credit-cap constraints.');
  }
  if (creditCapSkippedCount > 0) {
    notes.push(`${creditCapSkippedCount} suggested ${creditCapSkippedCount === 1 ? 'course was' : 'courses were'} held back to stay within your selected max credits.`);
  }
  if (initialPool.plannedElsewhereCount > 0) {
    notes.push(`${initialPool.plannedElsewhereCount} remaining requirement courses were skipped because they are already planned in later semesters.`);
  }
  if (initialPool.blockedCount > 0) {
    notes.push(`${initialPool.blockedCount} remaining courses are blocked by prerequisites, co-requisites, or term availability.`);
  }
  if (preferredMode !== 'Any' && initialPool.deliveryMismatchCount > 0) {
    notes.push(`${initialPool.deliveryMismatchCount} remaining courses were skipped because they do not match the "${preferredMode}" delivery preference.`);
  }
  if (initialPool.invalidCreditCount > 0) {
    notes.push(`${initialPool.invalidCreditCount} courses were skipped because their credit values look incomplete or invalid.`);
  }
  if (preferredMode === 'In Person') {
    notes.push('In-person preference is enforced by excluding courses tagged online or hybrid; untagged catalog courses are treated as in person.');
  } else if (preferredMode !== 'Any') {
    notes.push(`"${preferredMode}" preference is enforced using course delivery hints already present in the catalog data.`);
  }

  return notes.join(' ');
}

function buildLockedTargetDraftCourses(
  lockedCourses: SchedulerCourse[],
  majorData: SchedulerMajor,
  coverageWithoutTarget: Set<string>,
  prereqReadySet: Set<string>,
  parsedTargetTerm: ParsedTerm,
  scheduledAnywhere: Set<string>
): SchedulerDraftCourse[] {
  const candidatePool = buildCandidatePool(
    majorData,
    coverageWithoutTarget,
    prereqReadySet,
    new Set(scheduledAnywhere),
    parsedTargetTerm,
    new Map<string, SchedulerCourse>(),
    scheduledAnywhere,
    collectUnlockMap(majorData),
    'Any'
  );
  const candidateByIdent = new Map(
    candidatePool.candidates.map((candidate) => [candidate.normalizedIdent, candidate] as const)
  );

  return lockedCourses.map((course) => {
    const normalizedIdent = normalizeCourseIdent(course.courseIdent);
    const candidate = candidateByIdent.get(normalizedIdent);
    if (!candidate) {
      return {
        ...course,
        rationale: 'Already planned in this target term on your active flowchart.',
        reasonLabels: ['Already in target term'],
        unlockCount: 0,
      };
    }
    return candidateToDraftCourse(candidate, 'Already planned in this target term and');
  });
}

function buildCandidatePool(
  majorData: SchedulerMajor,
  coverageSet: Set<string>,
  prereqReadySet: Set<string>,
  coreqReadySet: Set<string>,
  parsedTargetTerm: ParsedTerm,
  laterScheduled: Map<string, SchedulerCourse>,
  scheduledAnywhere: Set<string>,
  unlockMap: Map<string, SchedulerCourse[]>,
  preferredMode: DeliveryPreference
): CandidatePoolSnapshot {
  const candidateByIdent = new Map<string, CandidateCourse>();
  const state = computeRequirementStateWithGroups(majorData, coverageSet);

  for (const requirement of majorData.degreeRequirements ?? []) {
    for (const course of requirement.courses ?? []) {
      const normalizedIdent = normalizeCourseIdent(course.courseIdent);
      if (!normalizedIdent || coverageSet.has(normalizedIdent)) {
        continue;
      }
      upsertCandidate(candidateByIdent, course, normalizedIdent, {
        key: `direct:${requirement.id}:${normalizedIdent}`,
        label: requirement.name,
        kind: 'direct',
        creditsApplied: 1,
      });
    }
  }

  for (const groupState of state.groupsNeedingWork) {
    for (const course of groupState.group.courses ?? []) {
      const normalizedIdent = normalizeCourseIdent(course.courseIdent);
      if (!normalizedIdent || coverageSet.has(normalizedIdent)) {
        continue;
      }
      upsertCandidate(candidateByIdent, course, normalizedIdent, {
        key: `group:${groupState.requirementId}:${groupState.group.id}:${normalizedIdent}`,
        label: groupState.group.name || groupState.requirementName,
        kind: 'group',
        creditsApplied: Math.min(courseCredits(course), groupState.remainingCredits),
      });
    }
  }

  const candidates = Array.from(candidateByIdent.values()).map((candidate) => {
    const offeredOk = isOfferedInTerm(candidate.course, parsedTargetTerm.term);
    const prereqOk = prerequisitesSatisfied(candidate.course, prereqReadySet);
    const coreqOk = corequisitesSatisfied(candidate.course, coreqReadySet);
    const deliveryOk = matchesDeliveryPreference(candidate.course, preferredMode);
    const validCredits = hasValidCredits(candidate.course);
    const plannedElsewhere = laterScheduled.has(candidate.normalizedIdent);
    const unlockCount = countUnlockedCourses(
      candidate.normalizedIdent,
      prereqReadySet,
      coverageSet,
      scheduledAnywhere,
      unlockMap
    );

    return {
      ...candidate,
      offeredOk,
      prereqOk,
      coreqOk,
      deliveryOk,
      validCredits,
      plannedElsewhere,
      unlockCount,
    };
  });

  return {
    candidates,
    blockedCount: candidates.filter((candidate) => !candidate.prereqOk || !candidate.coreqOk || !candidate.offeredOk).length,
    invalidCreditCount: candidates.filter((candidate) => !candidate.validCredits).length,
    plannedElsewhereCount: candidates.filter((candidate) => candidate.plannedElsewhere).length,
    deliveryMismatchCount: candidates.filter((candidate) => !candidate.deliveryOk).length,
  };
}

function computeRequirementState(majorData: SchedulerMajor, coverageSet: Set<string>): RequirementState {
  const state = computeRequirementStateWithGroups(majorData, coverageSet);
  return {
    unmetDirectCount: state.unmetDirectCount,
    unmetGroupCount: state.unmetGroupCount,
    remainingGroupCredits: state.remainingGroupCredits,
  };
}

function computeRequirementStateWithGroups(majorData: SchedulerMajor, coverageSet: Set<string>) {
  const groupsNeedingWork: Array<{
    requirementId: number;
    requirementName: string;
    group: SchedulerRequirementGroup;
    remainingCredits: number;
  }> = [];
  let unmetDirectCount = 0;
  let unmetGroupCount = 0;
  let remainingGroupCredits = 0;

  for (const requirement of majorData.degreeRequirements ?? []) {
    for (const course of requirement.courses ?? []) {
      const normalizedIdent = normalizeCourseIdent(course.courseIdent);
      if (!normalizedIdent || coverageSet.has(normalizedIdent)) {
        continue;
      }
      unmetDirectCount += 1;
    }

    for (const group of requirement.requirementGroups ?? []) {
      const requiredCredits = groupRequiredCredits(group);
      const coveredCredits = dedupeCourses(group.courses ?? []).reduce((sum, course) => {
        const normalizedIdent = normalizeCourseIdent(course.courseIdent);
        if (!normalizedIdent || !coverageSet.has(normalizedIdent)) {
          return sum;
        }
        return sum + groupCourseContribution(course, group);
      }, 0);
      const remainingCredits = Math.max(requiredCredits - Math.min(requiredCredits, coveredCredits), 0);
      if (remainingCredits <= 0) {
        continue;
      }

      unmetGroupCount += 1;
      remainingGroupCredits += remainingCredits;
      groupsNeedingWork.push({
        requirementId: requirement.id,
        requirementName: requirement.name,
        group,
        remainingCredits,
      });
    }
  }

  return {
    unmetDirectCount,
    unmetGroupCount,
    remainingGroupCredits,
    groupsNeedingWork,
  };
}

function buildScheduledContext(flowchart: Flowchart | null, parsedTargetTerm: ParsedTerm): ScheduledContext {
  const completed = new Set<string>();
  const inProgress = new Set<string>();
  const priorScheduled = new Map<string, SchedulerCourse>();
  const lockedTarget = new Map<string, SchedulerCourse>();
  const laterScheduled = new Map<string, SchedulerCourse>();
  const scheduledAnywhere = new Set<string>();
  const statusLookup = createStatusLookup(flowchart?.courseStatusMap);

  statusLookup.forEach((rawStatus, ident) => {
    const normalizedStatus = normalizeStatus(rawStatus);
    if (normalizedStatus === 'COMPLETED') {
      completed.add(ident);
      inProgress.delete(ident);
      return;
    }
    if (normalizedStatus === 'IN_PROGRESS' && !completed.has(ident)) {
      inProgress.add(ident);
    }
  });

  const sortedSemesters = [...(flowchart?.semesters ?? [])].sort(
    (left, right) => semesterRank(left) - semesterRank(right)
  );

  for (const semester of sortedSemesters) {
    const parsedSemester = parseSemester(semester);
    if (!parsedSemester) {
      continue;
    }
    const relation = compareTerms(parsedSemester, parsedTargetTerm);

    for (const course of semester.courses ?? []) {
      const normalizedIdent = normalizeCourseIdent(course.courseIdent);
      if (!normalizedIdent) {
        continue;
      }

      scheduledAnywhere.add(normalizedIdent);
      const schedulerCourse = toSchedulerCourse(course);
      const normalizedStatus = normalizeStatus(statusLookup.get(normalizedIdent));
      if (normalizedStatus === 'COMPLETED') {
        completed.add(normalizedIdent);
        inProgress.delete(normalizedIdent);
      } else if (normalizedStatus === 'IN_PROGRESS' && !completed.has(normalizedIdent)) {
        inProgress.add(normalizedIdent);
      }

      if (relation < 0) {
        if (!priorScheduled.has(normalizedIdent)) {
          priorScheduled.set(normalizedIdent, schedulerCourse);
        }
        continue;
      }
      if (relation === 0) {
        if (!lockedTarget.has(normalizedIdent)) {
          lockedTarget.set(normalizedIdent, schedulerCourse);
        }
        continue;
      }
      if (!laterScheduled.has(normalizedIdent)) {
        laterScheduled.set(normalizedIdent, schedulerCourse);
      }
    }
  }

  return {
    completed,
    inProgress,
    priorScheduled,
    lockedTarget,
    laterScheduled,
    scheduledAnywhere,
  };
}

function collectUnlockMap(majorData: SchedulerMajor): Map<string, SchedulerCourse[]> {
  const unlockMap = new Map<string, SchedulerCourse[]>();
  for (const course of collectUniqueCourses(majorData).values()) {
    for (const rawPrereq of extractPrerequisiteIdents(course)) {
      const normalizedPrereq = normalizeCourseIdent(rawPrereq);
      if (!normalizedPrereq) {
        continue;
      }
      const dependents = unlockMap.get(normalizedPrereq) ?? [];
      dependents.push(course);
      unlockMap.set(normalizedPrereq, dependents);
    }
  }
  return unlockMap;
}

function countUnlockedCourses(
  candidateIdent: string,
  prereqReadySet: Set<string>,
  coverageSet: Set<string>,
  scheduledAnywhere: Set<string>,
  unlockMap: Map<string, SchedulerCourse[]>
): number {
  return (unlockMap.get(candidateIdent) ?? []).filter((course) => {
    const normalizedIdent = normalizeCourseIdent(course.courseIdent);
    if (!normalizedIdent || coverageSet.has(normalizedIdent) || scheduledAnywhere.has(normalizedIdent)) {
      return false;
    }
    return prerequisitesSatisfiedWithAddedCourse(course, prereqReadySet, candidateIdent);
  }).length;
}

function prerequisitesSatisfied(course: SchedulerCourse, satisfied: Set<string>): boolean {
  const prereqs = extractPrerequisiteIdents(course);
  if (prereqs.length === 0) {
    return true;
  }
  return prereqs.every((rawPrereq) => {
    const normalized = normalizeCourseIdent(rawPrereq);
    return !normalized || satisfied.has(normalized);
  });
}

function prerequisitesSatisfiedWithAddedCourse(
  course: SchedulerCourse,
  satisfied: Set<string>,
  addedIdent: string
): boolean {
  const prereqs = extractPrerequisiteIdents(course);
  if (prereqs.length === 0) {
    return true;
  }
  return prereqs.every((rawPrereq) => {
    const normalized = normalizeCourseIdent(rawPrereq);
    return !normalized || normalized === addedIdent || satisfied.has(normalized);
  });
}

function corequisitesSatisfied(course: SchedulerCourse, satisfied: Set<string>): boolean {
  const coreqs = extractCorequisiteIdents(course);
  if (coreqs.length === 0) {
    return true;
  }
  return coreqs.every((rawCoreq) => {
    const normalized = normalizeCourseIdent(rawCoreq);
    return !normalized || satisfied.has(normalized);
  });
}

function isOfferedInTerm(course: SchedulerCourse, term: SchedulerTerm): boolean {
  const offered = String(course.offered ?? '').toUpperCase();
  if (!offered) {
    return true;
  }
  return offered.includes(term) || offered.includes('EVERY');
}

function matchesDeliveryPreference(course: SchedulerCourse, preferredMode: DeliveryPreference): boolean {
  if (preferredMode === 'Any') {
    return true;
  }

  const inferredMode = inferDeliveryMode(course);
  if (preferredMode === 'Online') {
    return inferredMode === 'ONLINE';
  }
  if (preferredMode === 'Hybrid') {
    return inferredMode === 'HYBRID';
  }
  return inferredMode !== 'ONLINE' && inferredMode !== 'HYBRID';
}

function inferDeliveryMode(course: SchedulerCourse): DeliveryMode {
  const modeHints = [
    course.name,
    course.description,
    course.hours,
    course.offered,
    course.prereq_txt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!modeHints) {
    return 'UNKNOWN';
  }

  if (
    containsAny(modeHints, [
      'hybrid',
      'blended',
      'combines online and in-person',
      'combines online and in person',
      'online and in-person',
      'online and in person',
      'web and classroom',
    ])
  ) {
    return 'HYBRID';
  }

  if (
    containsAny(modeHints, [
      'online',
      'distance education',
      'distance learning',
      'distance course',
      'web-based',
      'web based',
      'asynchronous',
      'synchronous online',
      'virtual',
      'remote',
    ])
  ) {
    return 'ONLINE';
  }

  if (
    containsAny(modeHints, [
      'face-to-face',
      'face to face',
      'in person',
      'in-person',
      'on campus',
      'on-campus',
      'classroom',
      'studio',
      'laboratory',
      'lab section',
    ])
  ) {
    return 'IN_PERSON';
  }

  return 'UNKNOWN';
}

function hasValidCredits(course: SchedulerCourse): boolean {
  const credits = Number(course.credits ?? 0);
  return Number.isFinite(credits) && credits >= 1 && credits <= 6;
}

function scoreCandidate(
  candidate: CandidateCourse,
  strategy: StrategyId,
  departmentCounts: Map<string, number>
): number {
  const credits = courseCredits(candidate.course);
  const departmentKey = extractDepartmentKey(candidate.course.courseIdent);
  const repeatedDepartmentPenalty = (departmentCounts.get(departmentKey) ?? 0) * 8;
  const requirementScore = candidate.reasons.reduce((sum, reason) => {
    if (reason.kind === 'direct') {
      return sum + 90;
    }
    return sum + Math.max(reason.creditsApplied, 1) * 18;
  }, 0);

  let score = requirementScore + candidate.unlockCount * 20;
  score += Math.max(0, 6 - Math.abs(credits - 3)) * 8;
  score -= repeatedDepartmentPenalty;

  if (strategy === 'acceleration') {
    score += candidate.unlockCount * 12;
    score += credits * 8;
    score += inferLevel(candidate.course.courseIdent) / 100;
  }

  if (strategy === 'light') {
    score += Math.max(0, 5 - credits) * 12;
    score -= inferLevel(candidate.course.courseIdent) / 160;
  }

  return score;
}

function buildReasonText(reasons: RequirementReason[], unlockCount: number): string {
  const directLabels = unique(reasons.filter((reason) => reason.kind === 'direct').map((reason) => reason.label));
  const groupLabels = unique(reasons.filter((reason) => reason.kind === 'group').map((reason) => reason.label));
  const parts: string[] = [];

  if (directLabels.length > 0) {
    parts.push(`covers ${joinLabels(directLabels)}`);
  }
  if (groupLabels.length > 0) {
    parts.push(`advances ${joinLabels(groupLabels)}`);
  }
  if (unlockCount > 0) {
    parts.push(`unlocks ${unlockCount} follow-up ${unlockCount === 1 ? 'course' : 'courses'}`);
  }

  return parts.length > 0 ? `${capitalize(parts.join(', '))}.` : 'Supports requirement progress.';
}

function candidateToDraftCourse(candidate: CandidateCourse, prefix: string): SchedulerDraftCourse {
  const reasonText = buildReasonText(candidate.reasons, candidate.unlockCount);
  const normalizedReasonText = reasonText ? reasonText.charAt(0).toLowerCase() + reasonText.slice(1) : '';
  return {
    ...candidate.course,
    rationale: `${prefix} ${normalizedReasonText}`.trim(),
    reasonLabels: unique(candidate.reasons.map((reason) => reason.label)),
    unlockCount: candidate.unlockCount,
  };
}

function countRequirementMoves(courses: SchedulerDraftCourse[]): number {
  const reasonLabels = new Set<string>();
  for (const course of courses) {
    for (const label of course.reasonLabels) {
      reasonLabels.add(label);
    }
  }
  return reasonLabels.size;
}

function upsertCandidate(
  candidateByIdent: Map<string, CandidateCourse>,
  course: SchedulerCourse,
  normalizedIdent: string,
  reason: RequirementReason
): void {
  const existing = candidateByIdent.get(normalizedIdent);
  if (!existing) {
    candidateByIdent.set(normalizedIdent, {
      course: toSchedulerCourse(course),
      normalizedIdent,
      reasons: [reason],
      unlockCount: 0,
      prereqOk: true,
      coreqOk: true,
      deliveryOk: true,
      offeredOk: true,
      validCredits: true,
      plannedElsewhere: false,
    });
    return;
  }

  if (!existing.reasons.some((existingReason) => existingReason.key === reason.key)) {
    existing.reasons.push(reason);
  }
}

function collectUniqueCourses(majorData: SchedulerMajor): Map<string, SchedulerCourse> {
  const courses = new Map<string, SchedulerCourse>();
  for (const requirement of majorData.degreeRequirements ?? []) {
    for (const course of requirement.courses ?? []) {
      const normalizedIdent = normalizeCourseIdent(course.courseIdent);
      if (!normalizedIdent) {
        continue;
      }
      courses.set(normalizedIdent, toSchedulerCourse(course));
    }
    for (const group of requirement.requirementGroups ?? []) {
      for (const course of group.courses ?? []) {
        const normalizedIdent = normalizeCourseIdent(course.courseIdent);
        if (!normalizedIdent) {
          continue;
        }
        courses.set(normalizedIdent, toSchedulerCourse(course));
      }
    }
  }
  return courses;
}

function dedupeCourses(courses: SchedulerCourse[]): SchedulerCourse[] {
  const uniqueCourses = new Map<string, SchedulerCourse>();
  for (const course of courses) {
    const normalizedIdent = normalizeCourseIdent(course.courseIdent);
    if (!normalizedIdent) {
      continue;
    }
    uniqueCourses.set(normalizedIdent, toSchedulerCourse(course));
  }
  return Array.from(uniqueCourses.values());
}

function groupRequiredCredits(group: SchedulerRequirementGroup): number {
  const explicitCredits = Number(group.satisfyingCredits ?? 0);
  if (Number.isFinite(explicitCredits) && explicitCredits > 0) {
    return explicitCredits;
  }
  const smallestPositiveCourse = dedupeCourses(group.courses ?? [])
    .map((course) => courseCredits(course))
    .filter((credits) => credits > 0)
    .sort((left, right) => left - right)[0];
  return smallestPositiveCourse ?? 1;
}

function groupCourseContribution(course: SchedulerCourse, group: SchedulerRequirementGroup): number {
  const credits = courseCredits(course);
  if (credits > 0) {
    return credits;
  }
  return groupRequiredCredits(group);
}

function courseCredits(course: SchedulerCourse): number {
  const credits = Number(course.credits ?? 0);
  return Number.isFinite(credits) ? credits : 0;
}

function inferCurrentSchedulerTerm(): ParsedTerm {
  const now = new Date();
  const month = now.getMonth() + 1;
  const term: SchedulerTerm = month <= 5 ? 'SPRING' : month <= 8 ? 'SUMMER' : 'FALL';
  return { term, year: now.getFullYear() };
}

function parseSemester(semester: Semester): ParsedTerm | null {
  const normalizedTerm = String(semester.term ?? '').trim().toUpperCase();
  if (!TERM_ORDER.includes(normalizedTerm as SchedulerTerm) || !Number.isFinite(semester.year)) {
    return null;
  }
  return { term: normalizedTerm as SchedulerTerm, year: semester.year };
}

function compareTerms(left: ParsedTerm, right: ParsedTerm): number {
  return termValue(left) - termValue(right);
}

function termValue(term: ParsedTerm): number {
  return term.year * 10 + TERM_RANK[term.term];
}

function semesterRank(semester: Semester): number {
  const parsed = parseSemester(semester);
  return parsed ? termValue(parsed) : Number.MAX_SAFE_INTEGER;
}

function inferLevel(courseIdent: string): number {
  const match = courseIdent.match(/(\d{4})/);
  return match ? Number(match[1]) : 0;
}

function extractDepartmentKey(courseIdent: string): string {
  const normalized = String(courseIdent ?? '').toUpperCase();
  const match = normalized.match(/^[A-Z]+/);
  return match?.[0] ?? normalized;
}

function toSchedulerCourse(course: Partial<SchedulerCourse>): SchedulerCourse {
  return {
    id: Number(course.id ?? 0),
    courseIdent: String(course.courseIdent ?? ''),
    name: String(course.name ?? ''),
    credits: Number(course.credits ?? 0),
    description: course.description,
    hours: course.hours,
    offered: course.offered,
    prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites : [],
    prereq_txt: course.prereq_txt,
  };
}

function extractPrerequisiteIdents(course: SchedulerCourse): string[] {
  const structured = unique(
    (course.prerequisites ?? [])
      .map((prereq) => normalizeCourseIdent(prereq))
      .filter(Boolean)
  );
  if (structured.length > 0) {
    return structured;
  }
  return parseCourseIdentsFromPrereqText(course.prereq_txt, false);
}

function extractCorequisiteIdents(course: SchedulerCourse): string[] {
  return parseCourseIdentsFromPrereqText(course.prereq_txt, true);
}

function parseCourseIdentsFromPrereqText(prereqText: string | undefined, coreqOnly: boolean): string[] {
  if (!prereqText) {
    return [];
  }

  const coursePattern = /\b([A-Z]{2,8}(?:\s+[A-Z]{1,3})?)\s*[-_ ]?\s*(\d{4})\b/g;
  const segments = String(prereqText).toUpperCase().split(/[.;\n]/);
  const results = new Set<string>();

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const isCoreq = isCorequisiteSegment(trimmed);
    if (coreqOnly !== isCoreq) continue;

    for (const match of trimmed.matchAll(coursePattern)) {
      const rawPrefix = match[1] ?? '';
      const digits = match[2] ?? '';
      const prefix = rawPrefix.replace(/[^A-Z]/g, '');
      if (!prefix || !digits) continue;
      results.add(normalizeCourseIdent(`${prefix}_${digits}`));
    }
  }

  return Array.from(results);
}

function isCorequisiteSegment(segmentUpper: string): boolean {
  return (
    segmentUpper.includes('CO-REQ') ||
    segmentUpper.includes('CO REQ') ||
    segmentUpper.includes('COREQ') ||
    segmentUpper.includes('CONCURRENT') ||
    segmentUpper.includes('ENROLLMENT IN') ||
    segmentUpper.includes('ENROLLED IN') ||
    segmentUpper.includes('TAKEN WITH')
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function joinLabels(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? '';
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function sanitizeSchedulerCreditLimit(value: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return clamp(Math.floor(numeric), 0, 20);
}

function capCoursesToCreditLimit<T extends Pick<SchedulerCourse, 'credits'>>(
  courses: T[],
  creditLimit: number
): CappedCourseSelection<T> {
  if (creditLimit <= 0) {
    return {
      courses: [],
      totalCredits: 0,
      skippedCount: courses.length,
    };
  }

  const selected: T[] = [];
  let totalCredits = 0;
  let skippedCount = 0;

  for (const course of courses) {
    const credits = Number(course.credits ?? 0);
    if (credits <= 0 || totalCredits + credits > creditLimit) {
      skippedCount += 1;
      continue;
    }
    selected.push(course);
    totalCredits += credits;
  }

  return { courses: selected, totalCredits, skippedCount };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
