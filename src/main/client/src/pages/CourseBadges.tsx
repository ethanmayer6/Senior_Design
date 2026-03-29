import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/Badge";
import type { Course } from "../types/course";
import api from "../api/axiosClient";
import Header from "../components/header";
import {
  getFlowchartInsights,
  getUserFlowchart,
  type Flowchart,
  type FlowchartInsights,
} from "../api/flowchartApi";
import {
  createStatusLookup,
  normalizeCourseIdent,
  normalizeStatus,
  resolveCourseStatus,
} from "../utils/flowchartStatus";

type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
type BadgeFilter = "ALL" | "RECENT" | "RARE_PLUS" | "LEGENDARY";

type EnrichedBadge = {
  course: Course;
  department: string;
  levelDigit: number;
  rarity: Rarity;
  xp: number;
  semesterRank: number;
  isRecent: boolean;
};

type UpcomingBadge = EnrichedBadge & {
  semesterLabel: string;
};

const FILTER_OPTIONS: Array<{ id: BadgeFilter; label: string }> = [
  { id: "ALL", label: "All Badges" },
  { id: "RECENT", label: "Recent Unlocks" },
  { id: "RARE_PLUS", label: "Rare +" },
  { id: "LEGENDARY", label: "Legendary" },
];

const RARITY_THEME: Record<
  Rarity,
  { label: string; border: string; pill: string; accent: string }
> = {
  COMMON: {
    label: "Common",
    border: "border-slate-200",
    pill: "bg-slate-100 text-slate-700",
    accent: "from-slate-200/70 to-slate-50/0",
  },
  RARE: {
    label: "Rare",
    border: "border-sky-200",
    pill: "bg-sky-100 text-sky-700",
    accent: "from-sky-200/70 to-sky-50/0",
  },
  EPIC: {
    label: "Epic",
    border: "border-fuchsia-200",
    pill: "bg-fuchsia-100 text-fuchsia-700",
    accent: "from-fuchsia-200/70 to-fuchsia-50/0",
  },
  LEGENDARY: {
    label: "Legendary",
    border: "border-amber-200",
    pill: "bg-amber-100 text-amber-800",
    accent: "from-amber-200/70 to-amber-50/0",
  },
};

function parseCourseIdent(courseIdent: string) {
  const normalized = String(courseIdent ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const [departmentRaw = "MISC", numberRaw = "0000"] = normalized.split("_");
  const courseNumber = numberRaw.replace(/\D/g, "") || "0000";
  const levelDigit = Number.parseInt(courseNumber.charAt(0) || "1", 10);
  return {
    department: departmentRaw || "MISC",
    courseNumber,
    levelDigit: Number.isNaN(levelDigit) ? 1 : levelDigit,
  };
}

function rarityFromLevel(levelDigit: number): Rarity {
  if (levelDigit >= 4) return "LEGENDARY";
  if (levelDigit === 3) return "EPIC";
  if (levelDigit === 2) return "RARE";
  return "COMMON";
}

function rarityScore(rarity: Rarity): number {
  if (rarity === "LEGENDARY") return 3;
  if (rarity === "EPIC") return 2;
  if (rarity === "RARE") return 1;
  return 0;
}

function xpForCourse(credits: number, levelDigit: number): number {
  const safeCredits = Math.max(1, Number(credits) || 1);
  let multiplier = 1.0;
  if (levelDigit === 2) multiplier = 1.2;
  if (levelDigit === 3) multiplier = 1.45;
  if (levelDigit >= 4) multiplier = 1.75;
  return Math.round(safeCredits * 100 * multiplier);
}

function xpRequirementForLevel(level: number): number {
  const safeLevel = Math.max(1, level);
  const n = safeLevel - 1;
  return n * n * 450;
}

function semesterRank(year: number, term: string | undefined): number {
  if (year <= 0) return -1;
  const upperTerm = (term ?? "").toUpperCase();
  const order: Record<string, number> = {
    SPRING: 1,
    SUMMER: 2,
    FALL: 3,
  };
  const termRank = order[upperTerm] ?? 9;
  return year * 10 + termRank;
}

function formatSemesterLabel(year: number, term: string | undefined): string {
  if (year <= 0) return "Transfer Credit";
  return `${term ?? "Term"} ${year}`;
}

function levelTitle(level: number): string {
  if (level >= 20) return "Grand Architect";
  if (level >= 14) return "Degree Vanguard";
  if (level >= 9) return "Plan Strategist";
  if (level >= 5) return "Roadmap Builder";
  return "First-Year Navigator";
}

function percent(progress: number, goal: number): number {
  if (goal <= 0) return 0;
  const value = Math.round((progress / goal) * 100);
  return Math.max(0, Math.min(100, value));
}

function normalizeDepartment(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export default function CourseBadges() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [flowchart, setFlowchart] = useState<Flowchart | null>(null);
  const [insights, setInsights] = useState<FlowchartInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<BadgeFilter>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");

  useEffect(() => {
    let active = true;

    const loadBadges = async () => {
      setLoading(true);
      setError(null);
      try {
        const [badgeResponse, userFlowchart, flowchartInsights] =
          await Promise.all([
            api.get<Course[]>("/badges/me"),
            getUserFlowchart(),
            getFlowchartInsights(),
          ]);

        if (!active) return;
        setCourses(badgeResponse.data ?? []);
        setFlowchart(userFlowchart);
        setInsights(flowchartInsights);
      } catch (err: any) {
        console.error("Error loading badges:", err);
        const backendMessage =
          err?.response?.data?.message ||
          (typeof err?.response?.data === "string" ? err.response.data : null);
        setError(backendMessage ?? "Failed to load badges. Please refresh and try again.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadBadges();
    return () => {
      active = false;
    };
  }, []);

  const statusLookup = useMemo(
    () => createStatusLookup(flowchart?.courseStatusMap),
    [flowchart?.courseStatusMap]
  );

  const completionRankByCourse = useMemo(() => {
    const lookup = new Map<string, number>();
    if (!flowchart?.semesters?.length) return lookup;
    flowchart.semesters.forEach((semester) => {
      const rank = semesterRank(semester.year, semester.term);
      (semester.courses ?? []).forEach((course) => {
        if (!course?.courseIdent) return;
        const status = normalizeStatus(resolveCourseStatus(statusLookup, course.courseIdent));
        if (status !== "COMPLETED") return;
        const ident = normalizeCourseIdent(course.courseIdent);
        const prev = lookup.get(ident) ?? -1;
        if (rank > prev) lookup.set(ident, rank);
      });
    });
    return lookup;
  }, [flowchart, statusLookup]);

  const recentRankSet = useMemo(() => {
    const uniqueRanks = Array.from(new Set(Array.from(completionRankByCourse.values())))
      .filter((rank) => rank > 0)
      .sort((a, b) => b - a);
    return new Set(uniqueRanks.slice(0, 2));
  }, [completionRankByCourse]);

  const enrichedBadges = useMemo<EnrichedBadge[]>(() => {
    const list = courses.map((course) => {
      const ident = normalizeCourseIdent(course.courseIdent);
      const { department, levelDigit } = parseCourseIdent(course.courseIdent);
      const rarity = rarityFromLevel(levelDigit);
      const courseRank = completionRankByCourse.get(ident) ?? -1;
      return {
        course,
        department,
        levelDigit,
        rarity,
        xp: xpForCourse(course.credits, levelDigit),
        semesterRank: courseRank,
        isRecent: recentRankSet.has(courseRank),
      };
    });

    list.sort((a, b) => {
      if (b.semesterRank !== a.semesterRank) return b.semesterRank - a.semesterRank;
      if (rarityScore(b.rarity) !== rarityScore(a.rarity)) {
        return rarityScore(b.rarity) - rarityScore(a.rarity);
      }
      return a.course.courseIdent.localeCompare(b.course.courseIdent);
    });

    return list;
  }, [courses, completionRankByCourse, recentRankSet]);

  const totalXp = useMemo(
    () => enrichedBadges.reduce((sum, badge) => sum + badge.xp, 0),
    [enrichedBadges]
  );

  const level = useMemo(() => Math.max(1, Math.floor(Math.sqrt(totalXp / 450)) + 1), [totalXp]);
  const currentLevelXpFloor = xpRequirementForLevel(level);
  const nextLevelXpFloor = xpRequirementForLevel(level + 1);
  const levelSpan = Math.max(1, nextLevelXpFloor - currentLevelXpFloor);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelXpFloor);
  const levelProgressPercent = percent(xpIntoLevel, levelSpan);
  const xpToNextLevel = Math.max(0, nextLevelXpFloor - totalXp);

  const rarityCounts = useMemo(() => {
    return enrichedBadges.reduce(
      (acc, badge) => {
        acc[badge.rarity] += 1;
        return acc;
      },
      {
        COMMON: 0,
        RARE: 0,
        EPIC: 0,
        LEGENDARY: 0,
      } as Record<Rarity, number>
    );
  }, [enrichedBadges]);

  const trackedDepartmentCounts = useMemo(() => {
    const map = new Map<string, number>();
    const statusMap = flowchart?.courseStatusMap ?? {};
    Object.keys(statusMap).forEach((courseIdent) => {
      const { department } = parseCourseIdent(courseIdent);
      const key = normalizeDepartment(department);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [flowchart]);

  const completedDepartmentCounts = useMemo(() => {
    const map = new Map<string, number>();
    enrichedBadges.forEach((badge) => {
      const key = normalizeDepartment(badge.department);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [enrichedBadges]);

  const departmentProgress = useMemo(() => {
    const departments = new Set<string>([
      ...Array.from(trackedDepartmentCounts.keys()),
      ...Array.from(completedDepartmentCounts.keys()),
    ]);

    const rows = Array.from(departments).map((department) => {
      const completed = completedDepartmentCounts.get(department) ?? 0;
      const tracked = trackedDepartmentCounts.get(department) ?? completed;
      const total = Math.max(completed, tracked, 1);
      return {
        department,
        completed,
        tracked: total,
        progressPercent: percent(completed, total),
      };
    });

    rows.sort((a, b) => {
      if (b.completed !== a.completed) return b.completed - a.completed;
      return a.department.localeCompare(b.department);
    });

    return rows;
  }, [completedDepartmentCounts, trackedDepartmentCounts]);

  const departmentOptions = useMemo(
    () => ["ALL", ...departmentProgress.map((entry) => entry.department)],
    [departmentProgress]
  );

  useEffect(() => {
    if (selectedDepartment === "ALL") return;
    if (!departmentOptions.includes(selectedDepartment)) {
      setSelectedDepartment("ALL");
    }
  }, [departmentOptions, selectedDepartment]);

  const spotlightBadge = enrichedBadges[0] ?? null;

  const upcomingBadges = useMemo<UpcomingBadge[]>(() => {
    if (!flowchart?.semesters?.length) return [];

    const seen = new Set<string>();
    const items: UpcomingBadge[] = [];

    flowchart.semesters.forEach((semester) => {
      const label = formatSemesterLabel(semester.year, semester.term);
      const rank = semesterRank(semester.year, semester.term);
      (semester.courses ?? []).forEach((course) => {
        if (!course?.courseIdent) return;
        const ident = normalizeCourseIdent(course.courseIdent);
        if (!ident || seen.has(ident)) return;
        const status = normalizeStatus(resolveCourseStatus(statusLookup, course.courseIdent));
        if (status !== "IN_PROGRESS") return;
        seen.add(ident);

        const { department, levelDigit } = parseCourseIdent(course.courseIdent);
        const rarity = rarityFromLevel(levelDigit);
        items.push({
          course,
          department,
          levelDigit,
          rarity,
          xp: xpForCourse(course.credits, levelDigit),
          semesterRank: rank,
          isRecent: false,
          semesterLabel: label,
        });
      });
    });

    items.sort((a, b) => {
      if (rarityScore(b.rarity) !== rarityScore(a.rarity)) {
        return rarityScore(b.rarity) - rarityScore(a.rarity);
      }
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (b.semesterRank !== a.semesterRank) return b.semesterRank - a.semesterRank;
      return a.course.courseIdent.localeCompare(b.course.courseIdent);
    });

    return items;
  }, [flowchart, statusLookup]);

  const filteredBadges = useMemo(() => {
    return enrichedBadges.filter((badge) => {
      if (selectedDepartment !== "ALL") {
        const normalized = normalizeDepartment(selectedDepartment);
        if (normalizeDepartment(badge.department) !== normalized) return false;
      }

      if (activeFilter === "RECENT" && !badge.isRecent) return false;
      if (activeFilter === "RARE_PLUS" && rarityScore(badge.rarity) < 1) return false;
      if (activeFilter === "LEGENDARY" && badge.rarity !== "LEGENDARY") return false;
      return true;
    });
  }, [activeFilter, enrichedBadges, selectedDepartment]);

  const emptyStateMessage = useMemo(() => {
    if (enrichedBadges.length === 0) return "No completed course badges yet. Upload progress to start collecting.";
    if (filteredBadges.length === 0) return "No badges match this filter. Try another rarity or department.";
    return null;
  }, [enrichedBadges.length, filteredBadges.length]);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_#fee2e2_0%,_#f8fafc_45%,_#f1f5f9_100%)]"
      style={{ fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif' }}
    >
      <Header />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-14 -left-10 h-56 w-56 rounded-full bg-red-200/40 blur-3xl" />
        <div className="absolute top-16 right-10 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-lg backdrop-blur-sm sm:p-6">
          <div className="absolute right-0 top-0 h-44 w-52 rounded-bl-3xl bg-gradient-to-br from-red-100/80 via-amber-50/70 to-transparent" />
          <div className="relative grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="inline-flex rounded-full border border-slate-300 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Badge Vault
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Course Quest Board
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Complete classes, collect rarity tiers, and level up your planner profile as you
                move toward graduation.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Level</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {level} <span className="text-xs font-semibold text-slate-500">{levelTitle(level)}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Total XP</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{totalXp.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Badges</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{enrichedBadges.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Next Unlocks</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {upcomingBadges.length}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <span>Level Progress</span>
                  <span>
                    {xpIntoLevel}/{levelSpan} XP
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-300 transition-all duration-700"
                    style={{ width: `${levelProgressPercent}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  {xpToNextLevel > 0
                    ? `${xpToNextLevel} XP to reach Level ${level + 1}.`
                    : `You have enough XP for Level ${level + 1} on next unlock.`}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Spotlight Unlock
              </div>
              {spotlightBadge ? (
                <div className="mt-3">
                  <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <Badge course={spotlightBadge.course} size={116} />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-900">
                    {spotlightBadge.course.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {spotlightBadge.course.courseIdent.replace("_", " ")}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${RARITY_THEME[spotlightBadge.rarity].pill}`}
                    >
                      {RARITY_THEME[spotlightBadge.rarity].label}
                    </span>
                    {spotlightBadge.isRecent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        New Unlock
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                      +{spotlightBadge.xp} XP
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                  Complete your first class to unlock this slot.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">Next Achievable Badges</h2>
              <span className="text-xs text-slate-500">{upcomingBadges.length} in-progress</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Finish your currently in-progress classes to unlock these next.
            </div>
            <div className="mt-3 space-y-3">
              {upcomingBadges.slice(0, 4).map((badge) => (
                <div key={badge.course.courseIdent} className={`rounded-xl border bg-slate-50/80 p-3 ${RARITY_THEME[badge.rarity].border}`}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-lg border border-white/70 bg-white/80 p-1 shadow-sm">
                      <Badge course={badge.course} size={72} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{badge.course.name}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {badge.course.courseIdent.replace("_", " ")} • {badge.semesterLabel}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RARITY_THEME[badge.rarity].pill}`}>
                          {RARITY_THEME[badge.rarity].label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          +{badge.xp} XP
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          In Progress
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingBadges.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                  No upcoming badge unlocks yet. Mark courses as in progress on your flowchart to see what is next.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">Collection Sets</h2>
            <div className="mt-3 space-y-3">
              {departmentProgress.slice(0, 5).map((entry) => (
                <div key={entry.department} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>{entry.department}</span>
                    <span>
                      {entry.completed}/{entry.tracked}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-300 transition-all duration-500"
                      style={{ width: `${entry.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
              {departmentProgress.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                  Department collections appear after your first completed course.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveFilter(option.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeFilter === option.id
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="departmentFilter" className="text-xs font-semibold text-slate-600">
                Department
              </label>
              <select
                id="departmentFilter"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
              >
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALL" ? "All Departments" : option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              Common: {rarityCounts.COMMON}
            </span>
            <span className="rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">
              Rare: {rarityCounts.RARE}
            </span>
            <span className="rounded-full bg-fuchsia-100 px-2 py-1 font-semibold text-fuchsia-700">
              Epic: {rarityCounts.EPIC}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">
              Legendary: {rarityCounts.LEGENDARY}
            </span>
            {insights?.projectedGraduationTerm && (
              <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                Projected Grad: {insights.projectedGraduationTerm}
              </span>
            )}
          </div>

          {loading && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm text-slate-600">
              Loading badge vault...
            </div>
          )}

          {!loading && emptyStateMessage && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              {emptyStateMessage}
            </div>
          )}

          {!loading && filteredBadges.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredBadges.map((badge) => (
                <article
                  key={badge.course.courseIdent}
                  className={`group relative overflow-hidden rounded-xl border bg-white px-2 py-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md ${RARITY_THEME[badge.rarity].border}`}
                >
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${RARITY_THEME[badge.rarity].accent}`}
                  />
                  <div className="relative flex flex-col items-center">
                    {badge.isRecent && (
                      <span className="mb-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        New
                      </span>
                    )}
                    <Badge course={badge.course} size={118} />
                    <div className="mt-2 text-center">
                      <div className="line-clamp-2 text-xs font-semibold text-slate-800">
                        {badge.course.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {badge.course.courseIdent.replace("_", " ")}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RARITY_THEME[badge.rarity].pill}`}
                        >
                          {RARITY_THEME[badge.rarity].label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          +{badge.xp} XP
                        </span>
                      </div>
                    </div>
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
