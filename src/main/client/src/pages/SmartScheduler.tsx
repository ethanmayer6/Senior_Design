import { useEffect, useMemo, useState } from 'react';
import Header from '../components/header';
import api from '../api/axiosClient';
import { getUserFlowchart, type Flowchart } from '../api/flowchartApi';
import { createStatusLookup, normalizeCourseIdent, normalizeStatus } from '../utils/flowchartStatus';

type DraftOption = {
  id: string;
  title: string;
  summary: string;
  projectedCredits: number;
  courses: SchedulerCourse[];
  notes: string;
  blockedCount: number;
};

type SchedulerCourse = {
  id: number;
  courseIdent: string;
  name: string;
  credits: number;
  offered?: string;
  prerequisites?: string[];
  prereq_txt?: string;
};

type SchedulerRequirementGroup = {
  id: number;
  name: string;
  satisfyingCredits: number;
  courses: SchedulerCourse[];
};

type SchedulerRequirement = {
  id: number;
  name: string;
  satisfyingCredits: number;
  courses: SchedulerCourse[];
  requirementGroups: SchedulerRequirementGroup[];
};

type SchedulerMajor = {
  id: number;
  name: string;
  degreeRequirements: SchedulerRequirement[];
};

type RequirementPool = {
  unmetDirect: SchedulerCourse[];
  unmetGroups: SchedulerRequirementGroup[];
  totalUnmetCourses: number;
};

const TERM_ORDER: Array<'SPRING' | 'SUMMER' | 'FALL'> = ['SPRING', 'SUMMER', 'FALL'];

function parseTerm(value: string): { term: 'SPRING' | 'SUMMER' | 'FALL'; year: number } | null {
  const [rawTerm, rawYear] = value.trim().toUpperCase().split(/\s+/);
  const year = Number(rawYear);
  if (!TERM_ORDER.includes(rawTerm as any) || !Number.isFinite(year)) return null;
  return { term: rawTerm as 'SPRING' | 'SUMMER' | 'FALL', year };
}

function nextTerm(value: { term: 'SPRING' | 'SUMMER' | 'FALL'; year: number }) {
  const index = TERM_ORDER.indexOf(value.term);
  if (index < TERM_ORDER.length - 1) {
    return { term: TERM_ORDER[index + 1], year: value.year };
  }
  return { term: TERM_ORDER[0], year: value.year + 1 };
}

function buildTermOptions(count = 8): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startingTerm: 'SPRING' | 'SUMMER' | 'FALL' =
    month <= 5 ? 'SPRING' : month <= 7 ? 'SUMMER' : 'FALL';
  const start = { term: startingTerm, year };
  const out: string[] = [];
  let cursor = start;
  for (let i = 0; i < count; i++) {
    out.push(`${cursor.term} ${cursor.year}`);
    cursor = nextTerm(cursor);
  }
  return out;
}

function isOfferedInTerm(course: SchedulerCourse, term: 'SPRING' | 'SUMMER' | 'FALL'): boolean {
  const offered = String(course.offered ?? '').toUpperCase();
  if (!offered) return true;
  return offered.includes(term);
}

function prerequisitesSatisfied(course: SchedulerCourse, satisfied: Set<string>): boolean {
  const prereqs = course.prerequisites ?? [];
  if (prereqs.length === 0) return true;
  return prereqs.every((raw) => {
    const normalized = normalizeCourseIdent(raw);
    return !normalized || satisfied.has(normalized);
  });
}

function inferLevel(courseIdent: string): number {
  const match = courseIdent.match(/(\d{4})/);
  if (!match) return 0;
  return Number(match[1]);
}

function dedupeCourses(courses: SchedulerCourse[]): SchedulerCourse[] {
  const map = new Map<string, SchedulerCourse>();
  for (const course of courses) {
    map.set(normalizeCourseIdent(course.courseIdent), course);
  }
  return Array.from(map.values());
}

function hasValidCredits(course: SchedulerCourse): boolean {
  const credits = Number(course.credits ?? 0);
  // Exclude placeholder/bad values like 0, and outliers that usually indicate bad import data.
  return Number.isFinite(credits) && credits >= 1 && credits <= 6;
}

export default function SmartScheduler() {
  const termOptions = useMemo(() => buildTermOptions(10), []);
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

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) {
      setLoadingMajorData(false);
      setMajorDataError('No user session found. Sign in to load major data.');
      return;
    }

    let userMajor = '';
    try {
      const parsed = JSON.parse(userRaw) as { major?: string };
      userMajor = parsed.major?.trim() || '';
    } catch {
      userMajor = '';
    }

    setMajorName(userMajor);
    if (!userMajor) {
      setLoadingMajorData(false);
      setMajorDataError('No major is set on your profile.');
      return;
    }

    async function loadMajorData() {
      setLoadingMajorData(true);
      setMajorDataError(null);
      try {
        const res = await api.get<SchedulerMajor>(`/majors/name/${encodeURIComponent(userMajor)}`);
        setMajorData(res.data);
      } catch (err: any) {
        setMajorData(null);
        setMajorDataError(err?.response?.data?.message || 'Failed to load degree requirement data.');
      } finally {
        setLoadingMajorData(false);
      }
    }

    void loadMajorData();
  }, []);

  useEffect(() => {
    async function loadFlowchart() {
      setLoadingFlowchart(true);
      setFlowchartError(null);
      try {
        const data = await getUserFlowchart();
        setFlowchart(data);
      } catch (err: any) {
        setFlowchart(null);
        setFlowchartError(err?.response?.data?.message || 'Failed to load flowchart data.');
      } finally {
        setLoadingFlowchart(false);
      }
    }
    void loadFlowchart();
  }, []);

  const statusSets = useMemo(() => {
    const completed = new Set<string>();
    const inProgress = new Set<string>();
    const lookup = createStatusLookup(flowchart?.courseStatusMap);
    lookup.forEach((status, ident) => {
      const normalizedStatus = normalizeStatus(status);
      if (normalizedStatus === 'COMPLETED') completed.add(ident);
      if (normalizedStatus === 'IN_PROGRESS') inProgress.add(ident);
    });
    return { completed, inProgress };
  }, [flowchart?.courseStatusMap]);

  const requirementStats = useMemo(() => {
    if (!majorData) {
      return { requirements: 0, groupedRequirements: 0, coursePool: 0 };
    }

    const uniqueCourses = new Set<string>();
    let groupedRequirements = 0;

    for (const requirement of majorData.degreeRequirements ?? []) {
      for (const course of requirement.courses ?? []) {
        uniqueCourses.add(course.courseIdent);
      }
      for (const group of requirement.requirementGroups ?? []) {
        groupedRequirements += 1;
        for (const course of group.courses ?? []) {
          uniqueCourses.add(course.courseIdent);
        }
      }
    }

    return {
      requirements: majorData.degreeRequirements?.length ?? 0,
      groupedRequirements,
      coursePool: uniqueCourses.size,
    };
  }, [majorData]);

  const requirementPool = useMemo<RequirementPool>(() => {
    if (!majorData) {
      return { unmetDirect: [], unmetGroups: [], totalUnmetCourses: 0 };
    }

    const satisfied = new Set<string>([...statusSets.completed, ...statusSets.inProgress]);
    const unmetDirect: SchedulerCourse[] = [];
    const unmetGroups: SchedulerRequirementGroup[] = [];

    for (const requirement of majorData.degreeRequirements ?? []) {
      for (const course of requirement.courses ?? []) {
        const ident = normalizeCourseIdent(course.courseIdent);
        if (!ident || satisfied.has(ident)) continue;
        unmetDirect.push(course);
      }

      for (const group of requirement.requirementGroups ?? []) {
        const hasSatisfiedInGroup = (group.courses ?? []).some((course) =>
          satisfied.has(normalizeCourseIdent(course.courseIdent))
        );
        if (!hasSatisfiedInGroup) {
          unmetGroups.push(group);
        }
      }
    }

    const unmetGroupCourseCount = unmetGroups.reduce((sum, group) => sum + (group.courses?.length ?? 0), 0);
    return {
      unmetDirect: dedupeCourses(unmetDirect),
      unmetGroups,
      totalUnmetCourses: dedupeCourses(unmetDirect).length + unmetGroupCourseCount,
    };
  }, [majorData, statusSets.completed, statusSets.inProgress]);

  const generatedSchedules = useMemo(() => {
    if (!generated || !majorData) return [] as DraftOption[];
    const parsed = parseTerm(targetTerm);
    if (!parsed) return [] as DraftOption[];

    const baseSatisfied = new Set<string>([...statusSets.completed, ...statusSets.inProgress]);

    const chooseGroupCandidates = (strategy: 'balanced' | 'acceleration' | 'light'): SchedulerCourse[] => {
      const picks: SchedulerCourse[] = [];
      for (const group of requirementPool.unmetGroups) {
        const candidates = (group.courses ?? [])
          .filter((course) => !baseSatisfied.has(normalizeCourseIdent(course.courseIdent)))
          .filter((course) => hasValidCredits(course))
          .map((course) => {
            const prereqOk = prerequisitesSatisfied(course, baseSatisfied);
            const offeredOk = isOfferedInTerm(course, parsed.term);
            const level = inferLevel(course.courseIdent);
            let score = 0;
            if (prereqOk) score += 50;
            if (offeredOk) score += 35;
            if (strategy === 'acceleration') score += Math.floor(level / 1000) * 4 + course.credits;
            if (strategy === 'light') score += Math.max(0, 6 - course.credits) * 3;
            if (strategy === 'balanced') score += Math.max(0, 5 - Math.abs(course.credits - 3));
            return { course, score, prereqOk, offeredOk };
          })
          .sort((a, b) => b.score - a.score);
        if (candidates.length > 0) {
          picks.push(candidates[0].course);
        }
      }
      return dedupeCourses(picks);
    };

    const buildOption = (
      id: 'balanced' | 'acceleration' | 'light',
      title: string,
      summary: string,
      creditLimit: number,
      maxClasses: number
    ): DraftOption => {
      const pickedGroupCourses = chooseGroupCandidates(id);
      const unmetDirect = requirementPool.unmetDirect;
      const candidateCourses = dedupeCourses([...unmetDirect, ...pickedGroupCourses]).map((course) => {
        const prereqOk = prerequisitesSatisfied(course, baseSatisfied);
        const offeredOk = isOfferedInTerm(course, parsed.term);
        const validCredits = hasValidCredits(course);
        const level = inferLevel(course.courseIdent);
        let score = 0;
        if (validCredits) score += 35;
        if (prereqOk) score += 100;
        if (offeredOk) score += 60;
        if (id === 'acceleration') score += Math.floor(level / 1000) * 8 + course.credits * 2;
        if (id === 'light') score += Math.max(0, 7 - course.credits) * 7;
        if (id === 'balanced') score += Math.max(0, 6 - Math.abs(course.credits - 3)) * 4;
        return { course, prereqOk, offeredOk, validCredits, score };
      });

      const sorted = candidateCourses
        .filter((item) => item.prereqOk && item.offeredOk && item.validCredits)
        .sort((a, b) => b.score - a.score);

      const selected: SchedulerCourse[] = [];
      let credits = 0;
      for (const item of sorted) {
        if (selected.length >= maxClasses) break;
        const nextCredits = credits + Math.max(item.course.credits, 0);
        if (nextCredits > creditLimit) continue;
        selected.push(item.course);
        credits = nextCredits;
      }

      const blockedCount = candidateCourses.filter((item) => !item.prereqOk || !item.offeredOk).length;
      const invalidCreditCount = candidateCourses.filter((item) => !item.validCredits).length;
      const notesParts: string[] = [];
      if (selected.length === 0) {
        notesParts.push('No eligible requirement courses met prerequisite/offering constraints for this term.');
      }
      if (invalidCreditCount > 0) {
        notesParts.push(`${invalidCreditCount} courses were excluded due to invalid credit data.`);
      }
      if (blockedCount > 0) {
        notesParts.push(`${blockedCount} additional requirement courses are blocked by prerequisites or not offered this term.`);
      }
      if (preferredMode !== 'Any') {
        notesParts.push(`Delivery preference "${preferredMode}" is currently advisory only (section-level mode data not available yet).`);
      }

      return {
        id,
        title,
        summary,
        projectedCredits: credits,
        courses: selected,
        notes: notesParts.join(' '),
        blockedCount,
      };
    };

    const accelerationMax = Math.min(20, Math.max(maxCredits, maxCredits + 2));
    const lightMax = Math.max(6, maxCredits - 3);

    return [
      buildOption('balanced', 'Balanced Path', 'Steady progress with prerequisite-safe sequencing.', maxCredits, 5),
      buildOption('acceleration', 'Acceleration Path', 'Higher-credit schedule to reduce remaining requirements faster.', accelerationMax, 6),
      buildOption('light', 'Light Load Path', 'Lower-credit schedule prioritizing near-term momentum.', lightMax, 4),
    ];
  }, [generated, majorData, targetTerm, maxCredits, requirementPool, statusSets.completed, statusSets.inProgress, preferredMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Planning Tool</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Smart Scheduler</h1>
          <p className="mt-3 max-w-3xl text-sm text-gray-600">
            Generates schedule options from your major requirements, flowchart completion status, prerequisites,
            and term availability.
          </p>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Target Term</label>
            <select
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              value={targetTerm}
              onChange={(e) => setTargetTerm(e.target.value)}
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
              min={6}
              max={20}
              value={maxCredits}
              onChange={(e) => setMaxCredits(Number(e.target.value))}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Preference</label>
            <select
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              value={preferredMode}
              onChange={(e) => setPreferredMode(e.target.value as 'Any' | 'In Person' | 'Online' | 'Hybrid')}
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
            className="h-fit self-end rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Generate Schedules
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-800">Degree Data Status</h2>
            <span className="text-xs text-gray-500">{majorName ? `Major: ${majorName}` : 'Major not set'}</span>
          </div>

          {loadingMajorData && <div className="mt-3 text-sm text-gray-600">Loading requirement data...</div>}
          {loadingFlowchart && <div className="mt-3 text-sm text-gray-600">Loading flowchart data...</div>}
          {!loadingMajorData && majorDataError && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {majorDataError}
            </div>
          )}
          {!loadingFlowchart && flowchartError && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {flowchartError}
            </div>
          )}
          {!loadingMajorData && !majorDataError && majorData && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-gray-500">Requirements</div>
                <div className="text-lg font-semibold text-gray-800">{requirementStats.requirements}</div>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-gray-500">Requirement Groups</div>
                <div className="text-lg font-semibold text-gray-800">{requirementStats.groupedRequirements}</div>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-gray-500">Scheduler Course Pool</div>
                <div className="text-lg font-semibold text-gray-800">{requirementStats.coursePool}</div>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2 sm:col-span-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Remaining Requirement Work</div>
                <div className="text-lg font-semibold text-gray-800">
                  {requirementPool.unmetDirect.length} unmet direct courses, {requirementPool.unmetGroups.length} unmet option groups
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-800">Draft Schedule Options</h2>
            <span className="text-xs text-gray-500">
              {generated ? `Showing options for ${targetTerm}` : 'Run generator to preview options'}
            </span>
          </div>

          {!generated && (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              Click <span className="font-semibold">Generate Schedules</span> to build requirement-aware schedule options.
            </div>
          )}

          {generated && generatedSchedules.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
              No schedule options could be generated. Check major/flowchart data and try again.
            </div>
          )}

          {generated && generatedSchedules.length > 0 && (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {generatedSchedules.map((option) => (
                <article key={option.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-800">{option.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{option.summary}</p>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>
                    {option.projectedCredits} Credits
                    </span>
                    <span>{option.blockedCount} blocked</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {option.courses.length === 0 && (
                      <li className="rounded-md bg-gray-50 px-2 py-1 text-gray-500">No eligible courses selected.</li>
                    )}
                    {option.courses.map((course) => (
                      <li key={course.courseIdent} className="rounded-md bg-gray-50 px-2 py-1">
                        <div className="font-medium">{course.courseIdent.replace('_', ' ')} ({course.credits})</div>
                        <div className="text-xs text-gray-600">{course.name}</div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-gray-500">{option.notes}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
