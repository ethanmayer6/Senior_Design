import { useEffect, useMemo, useState } from 'react';
import Header from '../components/header';
import api from '../api/axiosClient';
import {
  getMyFlowchartById,
  getUserFlowchart,
  updateSemesterCourses,
  type Flowchart,
} from '../api/flowchartApi';
import { createSemester } from '../api/semesterApi';
import { publishAppNotification } from '../utils/notifications';
import { normalizeCourseIdent } from '../utils/flowchartStatus';
import {
  buildSchedulerTermOptions,
  generateDraftOptions,
  parseSchedulerTerm,
  type DraftOption,
  type SchedulerDraftCourse,
  type SchedulerMajor,
} from '../utils/smartScheduler';

type StoredUser = {
  id?: number;
  major?: string;
};

type ApplyFeedback = {
  optionId: string;
  tone: 'success' | 'error';
  message: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    const responseMessage = response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage;
    }
  }
  return fallback;
}

function readStoredUser(): StoredUser | null {
  try {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      return null;
    }
    return JSON.parse(rawUser) as StoredUser;
  } catch {
    return null;
  }
}

function formatCourseIdent(courseIdent: string): string {
  return String(courseIdent ?? '')
    .replaceAll('_', ' ')
    .trim();
}

function formatSemesterLabel(term: string, year: number): string {
  return `${String(term ?? '').toUpperCase()} ${year}`;
}

function clampSchedulerCreditLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(20, Math.floor(value)));
}

function fitDraftCoursesWithinCreditLimit(courses: SchedulerDraftCourse[], creditLimit: number) {
  if (creditLimit <= 0) {
    return {
      courses: [] as SchedulerDraftCourse[],
      skippedCount: courses.length,
    };
  }

  const selected: SchedulerDraftCourse[] = [];
  let runningCredits = 0;
  let skippedCount = 0;

  for (const course of courses) {
    const credits = Number(course.credits ?? 0);
    if (!Number.isFinite(credits) || credits <= 0 || runningCredits + credits > creditLimit) {
      skippedCount += 1;
      continue;
    }
    selected.push(course);
    runningCredits += credits;
  }

  return { courses: selected, skippedCount };
}

function CourseList({
  title,
  courses,
  emptyLabel,
  tone,
}: {
  title: string;
  courses: SchedulerDraftCourse[];
  emptyLabel: string;
  tone: 'locked' | 'recommended';
}) {
  const badgeClasses =
    tone === 'locked'
      ? 'border-slate-200 bg-slate-50 text-slate-700'
      : 'border-red-100 bg-red-50 text-red-700';

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{title}</h4>
      <ul className="mt-2 space-y-2">
        {courses.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">
            {emptyLabel}
          </li>
        )}
        {courses.map((course) => (
          <li key={`${tone}-${course.courseIdent}`} className={`rounded-xl border px-3 py-3 ${badgeClasses}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{formatCourseIdent(course.courseIdent)}</div>
                <div className="text-xs text-gray-600">{course.name || 'Unnamed course'}</div>
              </div>
              <span className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                {course.credits} cr
              </span>
            </div>
            {course.reasonLabels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {course.reasonLabels.map((label) => (
                  <span
                    key={`${course.courseIdent}-${label}`}
                    className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-gray-700"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs leading-5 text-gray-600">{course.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SmartScheduler() {
  const termOptions = useMemo(() => buildSchedulerTermOptions(10), []);
  const [targetTerm, setTargetTerm] = useState(termOptions[0] ?? 'SPRING 2026');
  const [maxCredits, setMaxCredits] = useState(15);
  const [preferredMode, setPreferredMode] = useState<'Any' | 'In Person' | 'Online' | 'Hybrid'>('Any');
  const [generated, setGenerated] = useState(false);
  const [majorName, setMajorName] = useState('');
  const [majorData, setMajorData] = useState<SchedulerMajor | null>(null);
  const [loadingMajorData, setLoadingMajorData] = useState(true);
  const [majorDataError, setMajorDataError] = useState<string | null>(null);
  const [flowchart, setFlowchart] = useState<Flowchart | null>(null);
  const [loadingFlowchart, setLoadingFlowchart] = useState(true);
  const [flowchartError, setFlowchartError] = useState<string | null>(null);
  const [flowchartSource, setFlowchartSource] = useState('No flowchart loaded');
  const [applyingOptionId, setApplyingOptionId] = useState<string | null>(null);
  const [applyFeedback, setApplyFeedback] = useState<ApplyFeedback | null>(null);

  useEffect(() => {
    const storedUser = readStoredUser();
    const storedMajor = storedUser?.major?.trim() ?? '';
    if (storedMajor) {
      setMajorName(storedMajor);
    }

    async function loadFlowchart() {
      setLoadingFlowchart(true);
      setFlowchartError(null);
      try {
        let loadedFlowchart: Flowchart | null = null;
        let sourceLabel = 'Default flowchart';
        const activeKey = storedUser?.id ? `activeFlowchartId:${storedUser.id}` : null;
        const activeFlowchartId = activeKey ? Number(localStorage.getItem(activeKey)) : NaN;

        if (Number.isFinite(activeFlowchartId) && activeFlowchartId > 0) {
          loadedFlowchart = await getMyFlowchartById(activeFlowchartId);
          if (loadedFlowchart) {
            sourceLabel = 'Active flowchart';
          }
        }

        if (!loadedFlowchart) {
          loadedFlowchart = await getUserFlowchart();
        }

        setFlowchart(loadedFlowchart);
        setFlowchartSource(loadedFlowchart ? sourceLabel : 'No flowchart loaded');
        const flowchartMajor = String(loadedFlowchart?.majorName ?? loadedFlowchart?.major?.name ?? '').trim();
        if (flowchartMajor) {
          setMajorName(flowchartMajor);
        }
      } catch (err: unknown) {
        setFlowchart(null);
        setFlowchartSource('Unable to load flowchart');
        setFlowchartError(getErrorMessage(err, 'Failed to load flowchart data.'));
      } finally {
        setLoadingFlowchart(false);
      }
    }

    void loadFlowchart();
  }, []);

  useEffect(() => {
    const trimmedMajor = majorName.trim();
    if (!trimmedMajor) {
      if (loadingFlowchart) {
        return;
      }
      setMajorData(null);
      setLoadingMajorData(false);
      setMajorDataError('No major is set on your profile or active flowchart.');
      return;
    }

    async function loadMajorData() {
      setLoadingMajorData(true);
      setMajorDataError(null);
      try {
        const res = await api.get<SchedulerMajor>(`/majors/name/${encodeURIComponent(trimmedMajor)}`);
        setMajorData(res.data);
      } catch (err: unknown) {
        setMajorData(null);
        setMajorDataError(getErrorMessage(err, 'Failed to load degree requirement data.'));
      } finally {
        setLoadingMajorData(false);
      }
    }

    void loadMajorData();
  }, [majorName, loadingFlowchart]);

  const schedulerPlan = useMemo(
    () => generateDraftOptions(majorData, flowchart, targetTerm, maxCredits, preferredMode),
    [majorData, flowchart, targetTerm, maxCredits, preferredMode]
  );

  const generatedOptions = generated ? schedulerPlan.options : [];
  const schedulerSummary = schedulerPlan.summary;

  const reloadSchedulerFlowchart = async () => {
    let refreshedFlowchart: Flowchart | null = null;
    if (flowchart?.id) {
      refreshedFlowchart = await getMyFlowchartById(flowchart.id);
    }
    if (!refreshedFlowchart) {
      refreshedFlowchart = await getUserFlowchart();
    }
    setFlowchart(refreshedFlowchart);
    setFlowchartSource(refreshedFlowchart ? flowchartSource : 'No flowchart loaded');
    const flowchartMajor = String(refreshedFlowchart?.majorName ?? refreshedFlowchart?.major?.name ?? '').trim();
    if (flowchartMajor) {
      setMajorName(flowchartMajor);
    }
    return refreshedFlowchart;
  };

  const handleApplyOption = async (option: DraftOption) => {
    if (!flowchart?.id) {
      setApplyFeedback({
        optionId: option.id,
        tone: 'error',
        message: 'Load a flowchart first before pushing a generated draft.',
      });
      return;
    }

    const parsedTargetTerm = parseSchedulerTerm(targetTerm);
    if (!parsedTargetTerm) {
      setApplyFeedback({
        optionId: option.id,
        tone: 'error',
        message: 'Select a valid target term before applying a draft.',
      });
      return;
    }

    const selectedMaxCredits = clampSchedulerCreditLimit(maxCredits);
    const remainingCreditBudget = Math.max(0, selectedMaxCredits - option.lockedCredits);
    const cappedRecommendedCourses = fitDraftCoursesWithinCreditLimit(option.recommendedCourses, remainingCreditBudget);
    const courseIdents = cappedRecommendedCourses.courses
      .map((course) => String(course.courseIdent ?? '').trim().toUpperCase())
      .filter(Boolean);

    if (courseIdents.length === 0) {
      setApplyFeedback({
        optionId: option.id,
        tone: 'success',
        message:
          option.lockedCredits >= selectedMaxCredits
            ? `${formatSemesterLabel(parsedTargetTerm.term, parsedTargetTerm.year)} is already at or above your selected ${selectedMaxCredits}-credit cap, so no new courses were added.`
            : `There are no new suggested courses to add for ${formatSemesterLabel(parsedTargetTerm.term, parsedTargetTerm.year)} within your selected ${selectedMaxCredits}-credit cap.`,
      });
      return;
    }

    setApplyingOptionId(option.id);
    setApplyFeedback(null);

    try {
      let targetSemester =
        flowchart.semesters?.find(
          (semester) =>
            semester.year === parsedTargetTerm.year && String(semester.term ?? '').toUpperCase() === parsedTargetTerm.term
        ) ?? null;

      if (!targetSemester) {
        targetSemester = await createSemester({
          year: parsedTargetTerm.year,
          term: parsedTargetTerm.term,
          major: majorName.trim() || String(flowchart.majorName ?? flowchart.major?.name ?? '').trim(),
          flowchartId: flowchart.id,
          courseIdents: [],
        });
      }

      const existingCourseIdents = new Set(
        (targetSemester.courses ?? []).map((course) => normalizeCourseIdent(course.courseIdent))
      );
      let remainingCourseIdents = courseIdents.filter(
        (courseIdent) => !existingCourseIdents.has(normalizeCourseIdent(courseIdent))
      );

      if (remainingCourseIdents.length === 0) {
        setApplyFeedback({
          optionId: option.id,
          tone: 'success',
          message: `Those suggested courses are already on ${formatSemesterLabel(parsedTargetTerm.term, parsedTargetTerm.year)}.`,
        });
        return;
      }

      const addedCourseIdents: string[] = [];
      const failedMessages = new Map<string, string>();

      const maxPasses = Math.max(3, remainingCourseIdents.length);
      for (let pass = 0; pass < maxPasses && remainingCourseIdents.length > 0; pass += 1) {
        let madeProgress = false;
        const nextRemaining: string[] = [];

        for (const courseIdent of remainingCourseIdents) {
          try {
            await updateSemesterCourses(targetSemester.id, {
              operation: 'ADD',
              courseIdent,
            });
            addedCourseIdents.push(courseIdent);
            existingCourseIdents.add(normalizeCourseIdent(courseIdent));
            failedMessages.delete(courseIdent);
            madeProgress = true;
          } catch (error: unknown) {
            failedMessages.set(courseIdent, getErrorMessage(error, `Failed to add ${courseIdent}.`));
            nextRemaining.push(courseIdent);
          }
        }

        remainingCourseIdents = nextRemaining.filter(
          (courseIdent, index, list) => list.indexOf(courseIdent) === index
        );

        if (!madeProgress) {
          break;
        }
      }

      if (addedCourseIdents.length > 0) {
        await reloadSchedulerFlowchart();
      }

      const semesterLabel = formatSemesterLabel(parsedTargetTerm.term, parsedTargetTerm.year);
      if (addedCourseIdents.length > 0 && remainingCourseIdents.length === 0) {
        const creditCapNote =
          cappedRecommendedCourses.skippedCount > 0
            ? ` ${cappedRecommendedCourses.skippedCount} additional suggested ${cappedRecommendedCourses.skippedCount === 1 ? 'course was' : 'courses were'} held back to stay within your ${selectedMaxCredits}-credit limit.`
            : '';
        setApplyFeedback({
          optionId: option.id,
          tone: 'success',
          message: `Added ${addedCourseIdents.length} ${addedCourseIdents.length === 1 ? 'course' : 'courses'} to ${semesterLabel}.${creditCapNote}`,
        });
        return;
      }

      if (addedCourseIdents.length > 0) {
        const failedSummary = remainingCourseIdents
          .map((courseIdent) => failedMessages.get(courseIdent) ?? `Failed to add ${courseIdent}.`)
          .join(' ');
        setApplyFeedback({
          optionId: option.id,
          tone: 'error',
          message: `Added ${addedCourseIdents.length} ${addedCourseIdents.length === 1 ? 'course' : 'courses'} to ${semesterLabel}, but ${remainingCourseIdents.length} could not be added. ${failedSummary}`,
        });
        return;
      }

      const failedSummary = remainingCourseIdents
        .map((courseIdent) => failedMessages.get(courseIdent) ?? `Failed to add ${courseIdent}.`)
        .join(' ');
      setApplyFeedback({
        optionId: option.id,
        tone: 'error',
        message: `No courses were added to ${semesterLabel}. ${failedSummary}`,
      });
    } catch (error: unknown) {
      setApplyFeedback({
        optionId: option.id,
        tone: 'error',
        message: getErrorMessage(error, 'Failed to apply the generated draft to your flowchart.'),
      });
    } finally {
      setApplyingOptionId(null);
    }
  };

  useEffect(() => {
    if (!generated || schedulerSummary.invalidCreditCount <= 0) {
      return;
    }
    publishAppNotification({
      level: 'warning',
      title: 'Data Mismatch Detected',
      message: `${schedulerSummary.invalidCreditCount} course entries were excluded from scheduling because their credit values look incomplete or invalid. Re-importing catalog data will improve draft quality.`,
      actionLabel: 'Import Data',
      actionPath: '/courseflow',
      ttlMs: 12000,
    });
  }, [generated, schedulerSummary.invalidCreditCount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Planning Tool</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Smart Scheduler</h1>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Target Term</label>
            <select
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              value={targetTerm}
              onChange={(event) => setTargetTerm(event.target.value)}
            >
              {termOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Max Credits</label>
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={maxCredits}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setMaxCredits(Number.isFinite(nextValue) ? nextValue : 0);
              }}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Preference</label>
            <select
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              value={preferredMode}
              onChange={(event) => setPreferredMode(event.target.value as 'Any' | 'In Person' | 'Online' | 'Hybrid')}
            >
              <option>Any</option>
              <option>In Person</option>
              <option>Online</option>
              <option>Hybrid</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setGenerated(true)}
            disabled={loadingMajorData || loadingFlowchart || Boolean(majorDataError) || Boolean(flowchartError)}
            className="h-fit self-end rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {generated ? 'Refresh Drafts' : 'Generate Drafts'}
          </button>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-800">Draft Schedule Options</h2>
            <span className="text-xs text-gray-500">
              {generated ? `Showing options for ${targetTerm}` : 'Generate drafts to compare scheduling paths'}
            </span>
          </div>

          {!generated && (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              Generate drafts to compare balanced, accelerated, and lighter paths built from your current planning data.
            </div>
          )}

          {generated && generatedOptions.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
              No schedule options could be generated. Check your major, flowchart, and catalog data, then try again.
            </div>
          )}

          {generated && generatedOptions.length > 0 && (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {generatedOptions.map((option) => (
                <article key={option.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">{option.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{option.summary}</p>
                    </div>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                      {option.projectedCredits} credits
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Suggested Credits</div>
                      <div className="text-lg font-semibold text-gray-800">{option.recommendedCredits}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Locked Credits</div>
                      <div className="text-lg font-semibold text-gray-800">{option.lockedCredits}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Requirement Moves</div>
                      <div className="text-lg font-semibold text-gray-800">{option.requirementGain}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Still Blocked</div>
                      <div className="text-lg font-semibold text-gray-800">{option.blockedCount}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50/70 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">Push Draft</div>
                        <p className="mt-1 text-sm text-gray-700">
                          Add this option's suggested courses to {targetTerm}. The semester will be created if it does not exist yet.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleApplyOption(option)}
                        disabled={
                          applyingOptionId !== null
                          || !flowchart?.id
                          || option.recommendedCourses.length === 0
                          || loadingFlowchart
                        }
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
                      >
                        {applyingOptionId === option.id ? `Pushing To ${targetTerm}...` : `Push To ${targetTerm}`}
                      </button>
                    </div>
                    {applyFeedback?.optionId === option.id && (
                      <div
                        className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                          applyFeedback.tone === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {applyFeedback.message}
                      </div>
                    )}
                  </div>

                  <CourseList
                    title="Already In Target Term"
                    courses={option.lockedCourses}
                    emptyLabel="No courses are currently locked into this term."
                    tone="locked"
                  />

                  <CourseList
                    title="Suggested Additions"
                    courses={option.recommendedCourses}
                    emptyLabel="No new courses fit this path under the current constraints."
                    tone="recommended"
                  />

                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <span>{option.plannedElsewhereCount} planned later</span>
                      <span>{option.invalidCreditCount} invalid-credit exclusions</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-gray-600">{option.notes || 'No additional caveats for this path.'}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
