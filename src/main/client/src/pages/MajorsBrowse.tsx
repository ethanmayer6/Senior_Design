import { useEffect, useMemo, useState } from 'react';
import Header from '../components/header';
import { getMajorById, getMajorByName, getMajorSummaries, type Major, type MajorSummary } from '../api/majorsApi';
import api from '../api/axiosClient';
import {
  getFlowchartRequirementCoverage,
  getMyFlowchartById,
  getUserFlowchart,
  type Flowchart,
  type FlowchartRequirementCoverage
} from '../api/flowchartApi';
import { createStatusLookup, normalizeCourseIdent, normalizeStatus, resolveCourseStatus } from '../utils/flowchartStatus';
import { publishAppNotification } from '../utils/notifications';

export default function MajorsBrowse() {
  const [majorSummaries, setMajorSummaries] = useState<MajorSummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [summariesError, setSummariesError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [selectedMajorId, setSelectedMajorId] = useState<number | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [loadingMajor, setLoadingMajor] = useState(false);
  const [majorError, setMajorError] = useState<string | null>(null);
  const [userMajorName, setUserMajorName] = useState<string | null>(null);
  const [didAttemptAutoSelect, setDidAttemptAutoSelect] = useState(false);
  const [hasManualMajorSelection, setHasManualMajorSelection] = useState(false);
  const [userFlowchart, setUserFlowchart] = useState<Flowchart | null>(null);
  const [flowchartCoverage, setFlowchartCoverage] = useState<FlowchartRequirementCoverage | null>(null);

  const normalizeMajorName = (value: string | null | undefined): string =>
    String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

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
    if (!userMajorName || didAttemptAutoSelect || hasManualMajorSelection) {
      return;
    }
    const majorName = userMajorName;
    let active = true;
    async function autoSelectMajorByName() {
      try {
        const major = await getMajorByName(majorName);
        if (!active || !major?.id) return;
        setSelectedMajorId(major.id);
      } catch {
        const normalizedTarget = normalizeMajorName(majorName);
        const fallback = majorSummaries.find((major) => {
          const normalizedName = normalizeMajorName(major.name);
          return (
            normalizedName === normalizedTarget
            || normalizedName.includes(normalizedTarget)
            || normalizedTarget.includes(normalizedName)
          );
        });
        if (active && fallback?.id) {
          setSelectedMajorId(fallback.id);
        }
      } finally {
        if (active) {
          setDidAttemptAutoSelect(true);
        }
      }
    }
    void autoSelectMajorByName();
    return () => {
      active = false;
    };
  }, [userMajorName, didAttemptAutoSelect, hasManualMajorSelection, majorSummaries]);

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
            const preferredMajor =
              userMajorName
                ? majors.find(
                    (major) => normalizeMajorName(major.name) === normalizeMajorName(userMajorName)
                  )
                : null;
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
  }, [userMajorName]);

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
        const flowchartMajorName = String(flowchart?.major?.name ?? '').trim();
        if (flowchartMajorName) {
          setUserMajorName(flowchartMajorName);
        }
        const coverage = await getFlowchartRequirementCoverage();
        setFlowchartCoverage(coverage);
      } catch {
        setUserFlowchart(null);
        setFlowchartCoverage(null);
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

  const displayCredits = (credits: number | null | undefined): string => {
    if (!credits || credits <= 0) {
      return 'TBD';
    }
    return `${credits}`;
  };

  const { completedCourseIdents, inProgressCourseIdents } = useMemo(() => {
    const completed = new Set<string>();
    const inProgress = new Set<string>();
    const statusLookup = createStatusLookup(userFlowchart?.courseStatusMap);

    // Prefer explicit status map values because they can include imported report
    // statuses that are not yet represented in semester course arrays.
    statusLookup.forEach((rawStatus, ident) => {
      const status = normalizeStatus(rawStatus);
      if (status === 'COMPLETED') {
        completed.add(ident);
        inProgress.delete(ident);
      } else if (status === 'IN_PROGRESS' && !completed.has(ident)) {
        inProgress.add(ident);
      }
    });

    // Fallback: if some courses are only present in semesters, use those too.
    const semesters = userFlowchart?.semesters ?? [];
    semesters.forEach((semester) => {
      (semester.courses ?? []).forEach((course) => {
        const normalizedIdent = normalizeCourseIdent(course.courseIdent);
        if (!normalizedIdent) return;
        const status = normalizeStatus(resolveCourseStatus(statusLookup, course.courseIdent));
        if (status === 'COMPLETED') {
          completed.add(normalizedIdent);
          inProgress.delete(normalizedIdent);
          return;
        }
        if (status === 'IN_PROGRESS' && !completed.has(normalizedIdent)) {
          inProgress.add(normalizedIdent);
        }
      });
    });

    return { completedCourseIdents: completed, inProgressCourseIdents: inProgress };
  }, [userFlowchart]);

  const requirementProgressById = useMemo(() => {
    const progress = new Map<
      number,
      {
        totalSlots: number;
        completedSlots: number;
        inProgressSlots: number;
        remainingSlots: number;
        completedMatches: string[];
        inProgressMatches: string[];
      }
    >();

    (selectedMajor?.degreeRequirements ?? []).forEach((requirement) => {
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

      progress.set(requirement.id, {
        totalSlots,
        completedSlots,
        inProgressSlots,
        remainingSlots,
        completedMatches,
        inProgressMatches,
      });
    });

    return progress;
  }, [selectedMajor?.degreeRequirements, completedCourseIdents, inProgressCourseIdents]);

  const overallRequirementProgress = useMemo(() => {
    const requirements = selectedMajor?.degreeRequirements ?? [];
    const total = requirements.length;
    let completed = 0;
    let inProgressOnly = 0;

    requirements.forEach((requirement) => {
      const progress = requirementProgressById.get(requirement.id);
      if (!progress) return;
      if (progress.totalSlots === 0 || progress.completedSlots >= progress.totalSlots) {
        completed += 1;
      } else if (progress.inProgressSlots > 0) {
        inProgressOnly += 1;
      }
    });

    // For this top-level indicator, treat unmet requirements as in-progress.
    const inProgressWithUnmet = Math.max(total - completed, 0);

    return {
      total,
      completed,
      inProgress: inProgressWithUnmet,
      inProgressOnly,
      unmet: 0,
    };
  }, [selectedMajor?.degreeRequirements, requirementProgressById]);

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

  const strictViewCounts = useMemo(() => {
    const requirements = selectedMajor?.degreeRequirements ?? [];
    let satisfied = 0;
    let inProgress = 0;
    let unmet = 0;
    for (const requirement of requirements) {
      const progress = requirementProgressById.get(requirement.id);
      if (!progress) continue;
      if (progress.totalSlots === 0 || progress.completedSlots >= progress.totalSlots) {
        satisfied += 1;
      } else if (progress.inProgressSlots > 0) {
        inProgress += 1;
      } else {
        unmet += 1;
      }
    }
    return { total: requirements.length, satisfied, inProgress, unmet };
  }, [selectedMajor?.degreeRequirements, requirementProgressById]);

  useEffect(() => {
    if (!flowchartCoverage || !selectedMajor) return;
    const reqDiff = Math.abs((flowchartCoverage.totalRequirements ?? 0) - strictViewCounts.total);
    const satDiff = Math.abs((flowchartCoverage.satisfiedRequirements ?? 0) - strictViewCounts.satisfied);
    const ipDiff = Math.abs((flowchartCoverage.inProgressRequirements ?? 0) - strictViewCounts.inProgress);
    const unmetDiff = Math.abs((flowchartCoverage.unmetRequirements ?? 0) - strictViewCounts.unmet);
    const diverged = reqDiff > 2 || satDiff > 2 || ipDiff > 2 || unmetDiff > 2;
    if (!diverged) return;

    publishAppNotification({
      level: 'warning',
      title: 'Coverage Consistency Warning',
      message:
        'Majors Browse coverage and Flowchart coverage are out of sync. Re-import progress report or refresh major data.',
      actionLabel: 'Open Dashboard',
      actionPath: '/dashboard',
      ttlMs: 12000,
    });
  }, [flowchartCoverage, strictViewCounts, selectedMajor?.id]);

  const inferredGroupCredits = (requirementCredits: number, group: { satisfyingCredits: number; courses: { credits: number }[] }): number => {
    if (group.satisfyingCredits > 0) {
      return group.satisfyingCredits;
    }
    const positives = (group.courses ?? [])
      .map((course) => Math.max(0, course.credits))
      .filter((credit) => credit > 0);
    if (positives.length === 0) {
      return 0;
    }
    // If requirement has a known total, min positive works best for OR groups.
    if (requirementCredits > 0) {
      return Math.min(...positives);
    }
    return Math.min(...positives);
  };

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
    if (statusLabel === 'Satisfied') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (statusLabel === 'In progress') return 'border-amber-200 bg-amber-50 text-amber-700';
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
                    <span className="font-semibold text-slate-800">Requirement Progress</span>
                    <span className="text-slate-600">
                      {overallRequirementProgress.completed}/{overallRequirementProgress.total} met,{' '}
                      {overallRequirementProgress.inProgress} in progress
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    {(() => {
                      const total = overallRequirementProgress.total || 1;
                      const completedPct = (overallRequirementProgress.completed / total) * 100;
                      const inProgressPct = (overallRequirementProgress.inProgress / total) * 100;
                      return (
                        <div className="flex h-full w-full">
                          <div className="h-full bg-emerald-500" style={{ width: `${completedPct}%` }} />
                          <div className="h-full bg-orange-500" style={{ width: `${inProgressPct}%` }} />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    {overallRequirementProgress.completed} satisfied, {overallRequirementProgress.inProgress} in progress,{' '}
                    {overallRequirementProgress.unmet} unmet
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {selectedMajor.degreeRequirements?.map((requirement) => (
                    <article key={requirement.id} className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">{requirement.name}</h3>
                        <span className="text-xs text-slate-600">
                          {requirement.satisfyingCredits > 0
                            ? `${requirement.satisfyingCredits} credits`
                            : 'No credit cap specified'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        Direct courses: {requirement.courses?.length ?? 0} | Option groups:{' '}
                        {requirement.requirementGroups?.length ?? 0}
                      </div>
                      {(() => {
                        const progress = requirementProgressById.get(requirement.id);
                        if (!progress) return null;
                        const totalSlots = progress.totalSlots || 1;
                        const completedPct = (progress.completedSlots / totalSlots) * 100;
                        const inProgressPct = (progress.inProgressSlots / totalSlots) * 100;
                        const statusLabel =
                          progress.totalSlots === 0 || progress.completedSlots >= progress.totalSlots
                            ? 'Satisfied'
                            : progress.inProgressSlots > 0
                              ? 'In progress'
                              : 'Unmet';
                        return (
                          <div className="mt-3 rounded-md border border-slate-200 bg-white p-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-slate-700">Flowchart progress</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${requirementStatusTone(statusLabel)}`}>
                                {statusLabel}
                              </span>
                              <span className="text-slate-600">
                                {progress.completedSlots} met + {progress.inProgressSlots} in progress / {progress.totalSlots}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                              <div className="flex h-full w-full">
                                <div className="h-full bg-emerald-500" style={{ width: `${completedPct}%` }} />
                                <div className="h-full bg-orange-500" style={{ width: `${inProgressPct}%` }} />
                              </div>
                            </div>
                            {(progress.completedMatches.length > 0 || progress.inProgressMatches.length > 0) && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {progress.completedMatches.slice(0, 8).map((courseIdent) => (
                                  <span
                                    key={`${requirement.id}-met-${courseIdent}`}
                                    className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700"
                                  >
                                    {courseIdent}
                                  </span>
                                ))}
                                {progress.inProgressMatches.slice(0, 8).map((courseIdent) => (
                                  <span
                                    key={`${requirement.id}-ip-${courseIdent}`}
                                    className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700"
                                  >
                                    {courseIdent}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {(requirement.courses?.length ?? 0) > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Direct Courses
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
                                  {inferredGroupCredits(requirement.satisfyingCredits, group) > 0
                                    ? `${inferredGroupCredits(requirement.satisfyingCredits, group)} credits required`
                                    : 'OR option group'}
                                </div>
                              </div>
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
                  ))}
                </div>
              </>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
