import { useEffect, useMemo, useState } from 'react';
import Header from '../components/header';
import {
  getMajorById,
  getMajorSummaries,
  type Major,
  type MajorCourse,
  type MajorRequirement,
  type MajorSummary,
} from '../api/majorsApi';
import api from '../api/axiosClient';
import {
  getMyFlowchartById,
  getUserFlowchart,
  type Flowchart,
} from '../api/flowchartApi';
import {
  buildMajorProgress,
  loadMajorsBrowseSelectedMajorId,
  persistMajorsBrowseSelectedMajorId,
} from '../utils/majorProgress';
import { normalizeCourseIdent } from '../utils/flowchartStatus';

type RequirementBrowseSummary = {
  displayTargetCredits: number | null;
  listedCourseCount: number;
  optionGroupCount: number;
  optionChoiceCount: number;
  completedCourseMatches: string[];
  inProgressCourseMatches: string[];
  completedGroupCount: number;
  inProgressGroupCount: number;
  completedMatchedCredits: number;
  statusLabel: 'Target met' | 'All listed courses matched' | 'Has matches' | 'No matches yet';
  helperText: string;
};

function normalizeTextKey(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function formatCreditValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0';
  }
  return Number.isInteger(value) ? String(value) : String(value);
}

function extractRequirementTargetCredits(requirement: MajorRequirement): number | null {
  const labelMatch = requirement.name.match(/(\d+(?:\.\d+)?)\s*cr\b/i);
  if (labelMatch) {
    const parsed = Number(labelMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  if (requirement.satisfyingCredits > 0) {
    return requirement.satisfyingCredits;
  }
  return null;
}

function countCourseCredits(courses: MajorCourse[]): number {
  return courses.reduce((sum, course) => sum + Math.max(0, Number(course.credits ?? 0)), 0);
}

function pickMajorSummary(
  majorSummaries: MajorSummary[],
  majorName: string | null | undefined,
  preferredCollege: string | null | undefined
): MajorSummary | null {
  const normalizedName = normalizeTextKey(majorName);
  if (!normalizedName) {
    return null;
  }

  const exactMatches = majorSummaries.filter((major) => normalizeTextKey(major.name) === normalizedName);
  const nameMatches = exactMatches.length > 0
    ? exactMatches
    : majorSummaries.filter((major) => {
        const majorKey = normalizeTextKey(major.name);
        return majorKey.includes(normalizedName) || normalizedName.includes(majorKey);
      });
  if (nameMatches.length === 0) {
    return null;
  }

  const normalizedCollege = normalizeTextKey(preferredCollege);
  if (normalizedCollege) {
    const collegeMatch = nameMatches.find((major) => normalizeTextKey(major.college) === normalizedCollege);
    if (collegeMatch) {
      return collegeMatch;
    }
  }

  return nameMatches[0] ?? null;
}

function summarizeRequirementForBrowse(
  requirement: MajorRequirement,
  completedCourseIdents: Set<string>,
  inProgressCourseIdents: Set<string>
): RequirementBrowseSummary {
  const directCourses = requirement.courses ?? [];
  const groups = requirement.requirementGroups ?? [];
  const completedDirectCourses: MajorCourse[] = [];
  const inProgressDirectCourses: MajorCourse[] = [];
  const completedCourseMatches: string[] = [];
  const inProgressCourseMatches: string[] = [];
  let completedGroupCount = 0;
  let inProgressGroupCount = 0;
  let optionChoiceCount = 0;

  directCourses.forEach((course) => {
    const normalized = normalizeCourseIdent(course.courseIdent);
    if (!normalized) {
      return;
    }
    if (completedCourseIdents.has(normalized)) {
      completedDirectCourses.push(course);
      completedCourseMatches.push(course.courseIdent);
      return;
    }
    if (inProgressCourseIdents.has(normalized)) {
      inProgressDirectCourses.push(course);
      inProgressCourseMatches.push(course.courseIdent);
    }
  });

  groups.forEach((group) => {
    const groupCourses = group.courses ?? [];
    optionChoiceCount += groupCourses.length;

    const completedGroupCourse = groupCourses.find((course) =>
      completedCourseIdents.has(normalizeCourseIdent(course.courseIdent))
    );
    if (completedGroupCourse) {
      completedGroupCount += 1;
      completedCourseMatches.push(completedGroupCourse.courseIdent);
      return;
    }

    const inProgressGroupCourse = groupCourses.find((course) =>
      inProgressCourseIdents.has(normalizeCourseIdent(course.courseIdent))
    );
    if (inProgressGroupCourse) {
      inProgressGroupCount += 1;
      inProgressCourseMatches.push(inProgressGroupCourse.courseIdent);
    }
  });

  const displayTargetCredits = extractRequirementTargetCredits(requirement);
  const completedMatchedCredits = countCourseCredits(completedDirectCourses);
  const completedExplicitItemCount = completedDirectCourses.length + completedGroupCount;
  const totalExplicitItemCount = directCourses.length + groups.length;
  const totalMatchCount = completedCourseMatches.length + inProgressCourseMatches.length;

  let statusLabel: RequirementBrowseSummary['statusLabel'] = 'No matches yet';
  if (displayTargetCredits !== null && completedMatchedCredits >= displayTargetCredits) {
    statusLabel = 'Target met';
  } else if (
    displayTargetCredits === null
    && totalExplicitItemCount > 0
    && completedExplicitItemCount >= totalExplicitItemCount
  ) {
    statusLabel = 'All listed courses matched';
  } else if (totalMatchCount > 0) {
    statusLabel = 'Has matches';
  }

  let helperText = 'No listed courses from this section are on your current flowchart yet.';
  if (totalMatchCount > 0) {
    const courseSummary = `${completedCourseMatches.length} completed + ${inProgressCourseMatches.length} in progress listed course match${completedCourseMatches.length + inProgressCourseMatches.length === 1 ? '' : 'es'}`;
    const groupSummary =
      groups.length > 0
        ? ` | ${completedGroupCount} completed + ${inProgressGroupCount} in progress option group match${completedGroupCount + inProgressGroupCount === 1 ? '' : 'es'}`
        : '';
    helperText = `${courseSummary}${groupSummary}`;
  }

  return {
    displayTargetCredits,
    listedCourseCount: directCourses.length,
    optionGroupCount: groups.length,
    optionChoiceCount,
    completedCourseMatches,
    inProgressCourseMatches,
    completedGroupCount,
    inProgressGroupCount,
    completedMatchedCredits,
    statusLabel,
    helperText,
  };
}

export default function MajorsBrowse() {
  const [majorSummaries, setMajorSummaries] = useState<MajorSummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [summariesError, setSummariesError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [selectedMajorId, setSelectedMajorId] = useState<number | null>(() => loadMajorsBrowseSelectedMajorId());
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [loadingMajor, setLoadingMajor] = useState(false);
  const [majorError, setMajorError] = useState<string | null>(null);
  const [userMajorName, setUserMajorName] = useState<string | null>(null);
  const [userMajorCollege, setUserMajorCollege] = useState<string | null>(null);
  const [didAttemptAutoSelect, setDidAttemptAutoSelect] = useState(false);
  const [hasManualMajorSelection, setHasManualMajorSelection] = useState(false);
  const [userFlowchart, setUserFlowchart] = useState<Flowchart | null>(null);

  useEffect(() => {
    async function loadCurrentUserMajor() {
      try {
        const meResponse = await api.get<{ major?: string | null }>('/users/me');
        const majorFromProfile = meResponse?.data?.major?.trim() ?? '';
        setUserMajorName((current) => current ?? (majorFromProfile || null));
      } catch {
        setUserMajorName((current) => current ?? null);
      }
    }
    void loadCurrentUserMajor();
  }, []);

  useEffect(() => {
    if (!userMajorName || didAttemptAutoSelect || hasManualMajorSelection || majorSummaries.length === 0) {
      return;
    }
    const preferredMajor = pickMajorSummary(majorSummaries, userMajorName, userMajorCollege);
    if (preferredMajor?.id) {
      setSelectedMajorId(preferredMajor.id);
    }
    setDidAttemptAutoSelect(true);
  }, [userMajorName, userMajorCollege, didAttemptAutoSelect, hasManualMajorSelection, majorSummaries]);

  useEffect(() => {
    async function loadMajors() {
      setLoadingSummaries(true);
      setSummariesError(null);
      try {
        const majors = await getMajorSummaries();
        setMajorSummaries(majors);
        if (majors.length > 0) {
          setSelectedMajorId((current) => {
            if (current && majors.some((major) => major.id === current)) {
              return current;
            }
            if (current) {
              return current;
            }
            const preferredMajor = pickMajorSummary(majors, userMajorName, userMajorCollege);
            return preferredMajor?.id ?? majors[0].id;
          });
        }
      } catch (err: any) {
        setSummariesError(err?.response?.data?.message || 'Failed to load majors.');
      } finally {
        setLoadingSummaries(false);
      }
    }

    void loadMajors();
  }, [userMajorName, userMajorCollege]);

  useEffect(() => {
    async function loadFlowchart() {
      try {
        let flowchart: Flowchart | null = null;
        try {
          const storedUserRaw = localStorage.getItem('user');
          const storedUser = storedUserRaw ? (JSON.parse(storedUserRaw) as { id?: number }) : null;
          const activeKey = storedUser?.id ? `activeFlowchartId:${storedUser.id}` : null;
          const activeId = activeKey ? Number(localStorage.getItem(activeKey)) : NaN;
          if (Number.isFinite(activeId) && activeId > 0) {
            flowchart = await getMyFlowchartById(activeId);
          }
        } catch {
          flowchart = null;
        }
        if (!flowchart) {
          flowchart = await getUserFlowchart();
        }
        setUserFlowchart(flowchart);
        const flowchartMajorName = String(flowchart?.majorName ?? flowchart?.major?.name ?? '').trim();
        const flowchartMajorCollege = String(flowchart?.major?.college ?? '').trim();
        if (flowchartMajorName) {
          setUserMajorName(flowchartMajorName);
        }
        if (flowchartMajorCollege) {
          setUserMajorCollege(flowchartMajorCollege);
        }
      } catch {
        setUserFlowchart(null);
      }
    }
    void loadFlowchart();
  }, []);

  useEffect(() => {
    if (!selectedMajorId) {
      setSelectedMajor(null);
      return;
    }
    const majorId = selectedMajorId;
    async function loadSelectedMajor() {
      setLoadingMajor(true);
      setMajorError(null);
      try {
        const major = await getMajorById(majorId);
        setSelectedMajor(major);
      } catch (err: any) {
        setSelectedMajor(null);
        setMajorError(err?.response?.data?.message || 'Failed to load major details.');
      } finally {
        setLoadingMajor(false);
      }
    }
    void loadSelectedMajor();
  }, [selectedMajorId]);

  useEffect(() => {
    persistMajorsBrowseSelectedMajorId(selectedMajorId);
  }, [selectedMajorId]);

  const displayCredits = (credits: number | null | undefined): string => {
    if (!credits || credits <= 0) {
      return 'TBD';
    }
    return `${credits}`;
  };

  const {
    completedCourseIdents,
    inProgressCourseIdents,
  } = useMemo(() => buildMajorProgress(selectedMajor, userFlowchart), [selectedMajor, userFlowchart]);

  const requirementBrowseSummaries = useMemo(() => {
    const summaries = new Map<number, RequirementBrowseSummary>();
    (selectedMajor?.degreeRequirements ?? []).forEach((requirement) => {
      summaries.set(
        requirement.id,
        summarizeRequirementForBrowse(requirement, completedCourseIdents, inProgressCourseIdents)
      );
    });
    return summaries;
  }, [selectedMajor, completedCourseIdents, inProgressCourseIdents]);

  const majorBrowseSnapshot = useMemo(() => {
    const uniqueListedCourses = new Set<string>();
    let optionGroupCount = 0;
    let optionChoiceCount = 0;

    (selectedMajor?.degreeRequirements ?? []).forEach((requirement) => {
      (requirement.courses ?? []).forEach((course) => {
        const normalized = normalizeCourseIdent(course.courseIdent);
        if (normalized) {
          uniqueListedCourses.add(normalized);
        }
      });
      (requirement.requirementGroups ?? []).forEach((group) => {
        optionGroupCount += 1;
        optionChoiceCount += group.courses?.length ?? 0;
        (group.courses ?? []).forEach((course) => {
          const normalized = normalizeCourseIdent(course.courseIdent);
          if (normalized) {
            uniqueListedCourses.add(normalized);
          }
        });
      });
    });

    let completedListedCourses = 0;
    let inProgressListedCourses = 0;
    uniqueListedCourses.forEach((courseIdent) => {
      if (completedCourseIdents.has(courseIdent)) {
        completedListedCourses += 1;
        return;
      }
      if (inProgressCourseIdents.has(courseIdent)) {
        inProgressListedCourses += 1;
      }
    });

    return {
      requirementSectionCount: selectedMajor?.degreeRequirements?.length ?? 0,
      listedCourseCount: uniqueListedCourses.size,
      optionGroupCount,
      optionChoiceCount,
      completedListedCourses,
      inProgressListedCourses,
    };
  }, [selectedMajor, completedCourseIdents, inProgressCourseIdents]);

  const filteredMajorSummaries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return majorSummaries;
    }
    return majorSummaries.filter((major) => {
      const name = major.name?.toLowerCase() ?? '';
      const college = major.college?.replaceAll('_', ' ').toLowerCase() ?? '';
      return name.includes(normalizedQuery) || college.includes(normalizedQuery);
    });
  }, [majorSummaries, query]);

  const courseStatusTone = (courseIdent: string): string => {
    const normalized = normalizeCourseIdent(courseIdent);
    if (completedCourseIdents.has(normalized)) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (inProgressCourseIdents.has(normalized)) {
      return 'border-amber-200 bg-amber-50 text-amber-700';
    }
    return 'border-slate-200 bg-white text-slate-700';
  };

  const requirementStatusTone = (statusLabel: string): string => {
    if (statusLabel === 'Target met' || statusLabel === 'All listed courses matched') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (statusLabel === 'Has matches') {
      return 'border-amber-200 bg-amber-50 text-amber-700';
    }
    return 'border-slate-200 bg-slate-100 text-slate-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-800">Majors</h2>
            </div>
            {userMajorName && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                Auto-selected your major: {userMajorName}
                {userMajorCollege ? ` (${userMajorCollege.replaceAll('_', ' ')})` : ''}
              </div>
            )}

            <div className="relative mt-3">
              <i className="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search majors..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm text-slate-700"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{filteredMajorSummaries.length} result(s)</span>
            </div>

            <div className="mt-3 max-h-[34rem] overflow-y-auto pr-1 lg:max-h-[calc(100vh-14rem)]">
              {loadingSummaries && <div className="text-sm text-gray-600">Loading majors...</div>}
              {!loadingSummaries && summariesError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {summariesError}
                </div>
              )}
              {!loadingSummaries && !summariesError && filteredMajorSummaries.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  No majors match your search.
                </div>
              )}

              {!loadingSummaries && !summariesError && filteredMajorSummaries.length > 0 && (
                <div className="space-y-2">
                  {filteredMajorSummaries.map((major) => (
                    <button
                      key={major.id}
                      type="button"
                      onClick={() => {
                        setHasManualMajorSelection(true);
                        setSelectedMajorId(major.id);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selectedMajorId === major.id
                          ? 'border-red-300 bg-red-50 text-red-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
                      }`}
                    >
                      <div className="font-semibold">{major.name}</div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-wide opacity-80">{major.college.replaceAll('_', ' ')}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {loadingMajor && <div className="text-sm text-gray-600">Loading major details...</div>}
            {!loadingMajor && majorError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {majorError}
              </div>
            )}
            {!loadingMajor && !majorError && !selectedMajor && (
              <div className="text-sm text-gray-600">Select a major to view details.</div>
            )}

            {!loadingMajor && !majorError && selectedMajor && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">{selectedMajor.name}</h2>
                    <div className="mt-1 text-sm text-slate-600">College: {selectedMajor.college.replaceAll('_', ' ')}</div>
                  </div>
                </div>

                {selectedMajor.description && (
                  <p className="mt-4 text-sm text-gray-700">{selectedMajor.description}</p>
                )}

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-slate-800">Major Snapshot</span>
                    <span className="text-slate-600">
                      {majorBrowseSnapshot.requirementSectionCount} section{majorBrowseSnapshot.requirementSectionCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Requirement Sections</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">
                        {majorBrowseSnapshot.requirementSectionCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Listed Courses</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">
                        {majorBrowseSnapshot.listedCourseCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Option Groups</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">
                        {majorBrowseSnapshot.optionGroupCount}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {majorBrowseSnapshot.optionChoiceCount} listed choice{majorBrowseSnapshot.optionChoiceCount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Flowchart Matches</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">
                        {majorBrowseSnapshot.completedListedCourses} completed
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {majorBrowseSnapshot.inProgressListedCourses} in progress
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-600">
                    Majors Browse reflects the major record as stored. For credit buckets and choice-heavy sections like Biology,
                    matches are shown against the listed courses and option groups instead of assuming every listed course is a
                    separately required slot.
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {selectedMajor.degreeRequirements?.map((requirement) => {
                    const browseSummary = requirementBrowseSummaries.get(requirement.id);
                    if (!browseSummary) {
                      return null;
                    }

                    return (
                    <article key={requirement.id} className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">{requirement.name}</h3>
                        <span className="text-xs text-slate-600">
                          {browseSummary.displayTargetCredits !== null
                            ? `Target: ${formatCreditValue(browseSummary.displayTargetCredits)} credits`
                            : 'Requirement section'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        Listed courses: {browseSummary.listedCourseCount} | Option groups: {browseSummary.optionGroupCount}
                        {browseSummary.optionChoiceCount > 0 ? ` | Listed choices: ${browseSummary.optionChoiceCount}` : ''}
                      </div>

                      <div className="mt-3 rounded-md border border-slate-200 bg-white p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-slate-700">Flowchart matches</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${requirementStatusTone(browseSummary.statusLabel)}`}>
                            {browseSummary.statusLabel}
                          </span>
                        </div>
                        <div className="mt-1.5 text-xs text-slate-600">
                          {browseSummary.helperText}
                        </div>
                        {browseSummary.displayTargetCredits !== null && browseSummary.completedMatchedCredits > 0 && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            Completed listed-course credits: {formatCreditValue(browseSummary.completedMatchedCredits)} /{' '}
                            {formatCreditValue(browseSummary.displayTargetCredits)}
                          </div>
                        )}
                      </div>

                      {(requirement.courses?.length ?? 0) > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Listed Courses
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {requirement.courses.map((course) => (
                              <span
                                key={`${requirement.id}-direct-${course.id}-${course.courseIdent}`}
                                className={`rounded-md border px-2 py-1 text-xs ${courseStatusTone(course.courseIdent)}`}
                              >
                                {course.courseIdent} ({displayCredits(course.credits)})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(requirement.requirementGroups?.length ?? 0) > 0 && (
                        <div className="mt-3 space-y-2">
                          {requirement.requirementGroups.map((group) => (
                            <div key={`${requirement.id}-group-${group.id}`} className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-semibold text-slate-700">{group.name}</div>
                                <div className="text-xs text-slate-600">
                                  {group.satisfyingCredits > 0
                                    ? `Choose ${formatCreditValue(group.satisfyingCredits)} credits from this group`
                                    : 'Choose from this option group'}
                                </div>
                              </div>
                              {(() => {
                                const completedGroupCourse = (group.courses ?? []).find((course) =>
                                  completedCourseIdents.has(normalizeCourseIdent(course.courseIdent))
                                );
                                const inProgressGroupCourse = (group.courses ?? []).find((course) =>
                                  inProgressCourseIdents.has(normalizeCourseIdent(course.courseIdent))
                                );

                                return (
                                  <div className="mt-2 text-[11px] text-slate-500">
                                    {completedGroupCourse
                                      ? `Current flowchart match: ${completedGroupCourse.courseIdent} completed`
                                      : inProgressGroupCourse
                                        ? `Current flowchart match: ${inProgressGroupCourse.courseIdent} in progress`
                                        : 'No current flowchart match in this option group.'}
                                  </div>
                                );
                              })()}
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {group.courses?.map((course) => (
                                  <span
                                    key={`${group.id}-${course.id}-${course.courseIdent}`}
                                    className={`rounded-md border px-2 py-1 text-xs ${courseStatusTone(course.courseIdent)}`}
                                  >
                                    {course.courseIdent} ({displayCredits(course.credits)})
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
