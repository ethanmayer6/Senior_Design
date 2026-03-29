import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import { getUserFlowchart } from '../api/flowchartApi';
import type { CourseStatus, Flowchart } from '../api/flowchartApi';
import { createStatusLookup, normalizeStatus, resolveCourseStatus } from '../utils/flowchartStatus';
import { FileUpload } from 'primereact/fileupload';
import type { FileUploadSelectEvent } from 'primereact/fileupload';
import {
  getCurrentClassSchedule,
  importClassSchedule,
  type ClassScheduleEntry,
} from '../api/classScheduleApi';
import { publishAppNotification } from '../utils/notifications';

type WeekdayCode = 'M' | 'T' | 'W' | 'R' | 'F' | 'S' | 'U';
type WeeklyMeetingEntry = {
  day: WeekdayCode;
  entry: ClassScheduleEntry;
  start: number;
  end: number;
};
type PositionedWeeklyMeetingEntry = WeeklyMeetingEntry & {
  laneIndex: number;
  laneCount: number;
};

const WEEKDAY_COLUMNS: Array<{ code: WeekdayCode; label: string; fullLabel: string }> = [
  { code: 'M', label: 'Mon', fullLabel: 'Monday' },
  { code: 'T', label: 'Tue', fullLabel: 'Tuesday' },
  { code: 'W', label: 'Wed', fullLabel: 'Wednesday' },
  { code: 'R', label: 'Thu', fullLabel: 'Thursday' },
  { code: 'F', label: 'Fri', fullLabel: 'Friday' },
  { code: 'S', label: 'Sat', fullLabel: 'Saturday' },
  { code: 'U', label: 'Sun', fullLabel: 'Sunday' },
];

const COURSE_BLOCK_STYLES = [
  'border-red-300 bg-red-100 text-red-900',
  'border-blue-300 bg-blue-100 text-blue-900',
  'border-emerald-300 bg-emerald-100 text-emerald-900',
  'border-amber-300 bg-amber-100 text-amber-900',
  'border-violet-300 bg-violet-100 text-violet-900',
  'border-cyan-300 bg-cyan-100 text-cyan-900',
  'border-pink-300 bg-pink-100 text-pink-900',
  'border-orange-300 bg-orange-100 text-orange-900',
];

function getCurrentTerm(date: Date): 'SPRING' | 'SUMMER' | 'FALL' {
  const month = date.getMonth() + 1;
  if (month <= 5) return 'SPRING';
  if (month <= 8) return 'SUMMER';
  return 'FALL';
}

function getCurrentDayCode(date: Date): WeekdayCode {
  const codeByDayIndex: WeekdayCode[] = ['U', 'M', 'T', 'W', 'R', 'F', 'S'];
  return codeByDayIndex[date.getDay()] ?? 'M';
}

function parseMinutes(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes >= 60) {
    return null;
  }

  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else if (meridiem === 'PM') {
    if (hours < 12) hours += 12;
  }

  if (hours < 0 || hours >= 24) return null;
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const normalizedHours = Math.floor(minutes / 60);
  const normalizedMinutes = minutes % 60;
  const suffix = normalizedHours >= 12 ? 'PM' : 'AM';
  const displayHours = normalizedHours % 12 === 0 ? 12 : normalizedHours % 12;
  return `${displayHours}:${String(normalizedMinutes).padStart(2, '0')} ${suffix}`;
}

function parseMeetingDays(raw: string | null | undefined): WeekdayCode[] {
  if (!raw) return [];
  const compact = raw.toUpperCase().replace(/[^A-Z]/g, '');
  if (!compact || /(TBA|ARR|ONLINE|ASYNCHRONOUS)/.test(compact)) {
    return [];
  }

  const normalized = compact
    .replace(/SUNDAY|SUN/g, 'U')
    .replace(/SATURDAY|SAT/g, 'S')
    .replace(/THURSDAY|THURS|THUR|TH/g, 'R')
    .replace(/TUESDAY|TUES|TUE/g, 'T')
    .replace(/MONDAY|MON/g, 'M')
    .replace(/WEDNESDAY|WEDS|WED/g, 'W')
    .replace(/FRIDAY|FRI/g, 'F');

  const seen = new Set<WeekdayCode>();
  const result: WeekdayCode[] = [];
  normalized.split('').forEach((character) => {
    const code = character as WeekdayCode;
    if (!WEEKDAY_COLUMNS.some((day) => day.code === code) || seen.has(code)) {
      return;
    }
    seen.add(code);
    result.push(code);
  });
  return result;
}

function courseBlockTone(courseIdent: string): string {
  let hash = 0;
  for (let index = 0; index < courseIdent.length; index += 1) {
    hash = (hash * 31 + courseIdent.charCodeAt(index)) % COURSE_BLOCK_STYLES.length;
  }
  return COURSE_BLOCK_STYLES[Math.abs(hash) % COURSE_BLOCK_STYLES.length];
}

function layoutMeetingsForDay(entries: WeeklyMeetingEntry[]): PositionedWeeklyMeetingEntry[] {
  if (entries.length === 0) return [];

  const positioned: PositionedWeeklyMeetingEntry[] = [];
  let cluster: WeeklyMeetingEntry[] = [];
  let clusterEnd = -1;

  const finalizeCluster = () => {
    if (cluster.length === 0) return;

    const laneEndTimes: number[] = [];
    const provisional = cluster.map((entry) => {
      let laneIndex = laneEndTimes.findIndex((endTime) => endTime <= entry.start);
      if (laneIndex === -1) {
        laneIndex = laneEndTimes.length;
        laneEndTimes.push(entry.end);
      } else {
        laneEndTimes[laneIndex] = entry.end;
      }
      return { entry, laneIndex };
    });

    const laneCount = Math.max(laneEndTimes.length, 1);
    provisional.forEach(({ entry, laneIndex }) => {
      positioned.push({
        ...entry,
        laneIndex,
        laneCount,
      });
    });

    cluster = [];
    clusterEnd = -1;
  };

  entries.forEach((entry) => {
    if (cluster.length === 0) {
      cluster = [entry];
      clusterEnd = entry.end;
      return;
    }

    if (entry.start < clusterEnd) {
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.end);
      return;
    }

    finalizeCluster();
    cluster = [entry];
    clusterEnd = entry.end;
  });

  finalizeCluster();
  return positioned;
}

export default function CurrentClasses() {
  const [flowchart, setFlowchart] = useState<Flowchart | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ClassScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentTerm = getCurrentTerm(today);
  const todayCode = getCurrentDayCode(today);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [flowchartResult, scheduleResult] = await Promise.all([
          getUserFlowchart(),
          getCurrentClassSchedule().catch(() => []),
        ]);
        setFlowchart(flowchartResult);
        setScheduleEntries(scheduleResult);
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Failed to load current classes.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const statusLookup = useMemo(() => createStatusLookup(flowchart?.courseStatusMap), [flowchart?.courseStatusMap]);

  const currentSemester = useMemo(() => {
    const semesters = flowchart?.semesters ?? [];
    return semesters.find(
      (semester) => semester.year === currentYear && String(semester.term).toUpperCase() === currentTerm
    );
  }, [flowchart?.semesters, currentYear, currentTerm]);

  const currentCourses = useMemo(() => {
    return (currentSemester?.courses ?? []).map((course) => {
      const status = resolveCourseStatus(statusLookup, course.courseIdent);
      return { ...course, status };
    });
  }, [currentSemester?.courses, statusLookup]);

  const hasImportedSchedule = scheduleEntries.length > 0;

  const formattedDate = useMemo(
    () =>
      today.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [today]
  );

  const weeklySchedule = useMemo<WeeklyMeetingEntry[]>(() => {
    return scheduleEntries
      .flatMap((entry) => {
        const start = parseMinutes(entry.meetingStartTime);
        const end = parseMinutes(entry.meetingEndTime);
        const days = parseMeetingDays(entry.meetingDays);
        if (start === null || end === null || end <= start || days.length === 0) {
          return [];
        }
        return days.map((day) => ({ day, entry, start, end }));
      })
      .sort((left, right) => {
        if (left.day !== right.day) {
          return WEEKDAY_COLUMNS.findIndex((day) => day.code === left.day)
            - WEEKDAY_COLUMNS.findIndex((day) => day.code === right.day);
        }
        if (left.start !== right.start) {
          return left.start - right.start;
        }
        return left.entry.courseIdent.localeCompare(right.entry.courseIdent);
      });
  }, [scheduleEntries]);

  const { weeklyTimelineStart, weeklyTimelineEnd, weeklyTimeTicks, weeklyCalendarHeight } = useMemo(() => {
    if (weeklySchedule.length === 0) {
      const fallbackStart = 7 * 60;
      const fallbackEnd = 22 * 60;
      return {
        weeklyTimelineStart: fallbackStart,
        weeklyTimelineEnd: fallbackEnd,
        weeklyTimeTicks: Array.from({ length: fallbackEnd / 60 - fallbackStart / 60 + 1 }, (_, index) => fallbackStart + index * 60),
        weeklyCalendarHeight: Math.max(620, ((fallbackEnd - fallbackStart) / 60) * 54),
      };
    }

    const earliestStart = Math.min(...weeklySchedule.map((item) => item.start));
    const latestEnd = Math.max(...weeklySchedule.map((item) => item.end));
    const computedStart = Math.max(6 * 60, Math.floor((earliestStart - 30) / 60) * 60);
    const computedEnd = Math.min(23 * 60, Math.ceil((latestEnd + 30) / 60) * 60);
    const start = computedStart < computedEnd ? computedStart : 7 * 60;
    const end = computedEnd > start ? computedEnd : 22 * 60;
    const tickCount = Math.max(1, Math.round((end - start) / 60));

    return {
      weeklyTimelineStart: start,
      weeklyTimelineEnd: end,
      weeklyTimeTicks: Array.from({ length: tickCount + 1 }, (_, index) => start + index * 60),
      weeklyCalendarHeight: Math.max(620, ((end - start) / 60) * 54),
    };
  }, [weeklySchedule]);

  const weeklyScheduleByDay = useMemo(() => {
    return WEEKDAY_COLUMNS.map((day) => ({
      ...day,
      entries: layoutMeetingsForDay(weeklySchedule.filter((item) => item.day === day.code)),
    }));
  }, [weeklySchedule]);

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const showNowMarker = nowMinutes >= weeklyTimelineStart && nowMinutes <= weeklyTimelineEnd;
  const nowMarkerTopPercent =
    ((Math.max(weeklyTimelineStart, Math.min(weeklyTimelineEnd, nowMinutes)) - weeklyTimelineStart)
      / Math.max(weeklyTimelineEnd - weeklyTimelineStart, 1))
    * 100;

  const onScheduleImport = async (e: FileUploadSelectEvent) => {
    const file = e.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await importClassSchedule(file);
      const [flowchartResult, scheduleResult] = await Promise.all([
        getUserFlowchart(),
        getCurrentClassSchedule(),
      ]);
      setFlowchart(flowchartResult);
      setScheduleEntries(scheduleResult);

      publishAppNotification({
        level: 'success',
        title: 'Schedule Imported',
        message: `${result.importedRows} row(s) imported and synced to your current term.`,
      });
    } catch (err: any) {
      const message = err?.response?.data || err?.message || 'Failed to import class schedule.';
      publishAppNotification({
        level: 'error',
        title: 'Schedule Import Failed',
        message: String(message),
      });
    } finally {
      setImporting(false);
    }
  };

  const statusClass = (status: CourseStatus | undefined) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'COMPLETED') return 'bg-emerald-100 text-emerald-800';
    if (normalized === 'IN_PROGRESS') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Current Semester View</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Current Classes</h1>
              <p className="mt-2 text-sm text-gray-600">
                Based on today ({formattedDate}), the current term is{' '}
                <span className="font-semibold">{`${currentTerm} ${currentYear}`}</span>.
              </p>
            </div>
            <Link
              to="/courseflow"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-arrow-left mr-2 text-red-500"></i>
              Back
            </Link>
          </div>
          {!hasImportedSchedule && (
            <>
              <div className="mt-4 flex max-w-xs items-center gap-3">
                <FileUpload
                  name="file"
                  accept=".xlsx"
                  mode="basic"
                  auto
                  chooseLabel={importing ? 'Importing...' : 'Import Schedule Excel'}
                  chooseOptions={{ className: 'w-full text-center' }}
                  disabled={importing}
                  customUpload
                  uploadHandler={() => {}}
                  onSelect={onScheduleImport}
                  className="w-full"
                />
              </div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold">Workday export steps:</span>{' '}
                go to Workday -&gt; Student -&gt; Academics -&gt; scroll down to Current Courses Snapshot -&gt; settings icon
                -&gt; Download to Excel.
              </div>
            </>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {loading && <div className="text-sm text-slate-600">Loading current classes...</div>}
          {!loading && error && <div className="text-sm text-red-600">{error}</div>}

          {!loading && !error && !flowchart && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No flowchart found. Import your academic progress report first.
            </div>
          )}

          {!loading && !error && flowchart && !currentSemester && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No semester matching {currentTerm} {currentYear} was found in your flowchart.
            </div>
          )}

          {!loading && !error && currentSemester && currentCourses.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              {currentTerm} {currentYear} is present but has no courses yet.
            </div>
          )}

          {!loading && !error && scheduleEntries.length > 0 && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                    Weekly Calendar
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Imported meeting times laid out across the full week for {currentTerm} {currentYear}.
                  </div>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {weeklySchedule.length} timed meeting{weeklySchedule.length === 1 ? '' : 's'}
                </div>
              </div>

              {weeklySchedule.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] gap-2">
                      <div></div>
                      {weeklyScheduleByDay.map((day) => (
                        <div
                          key={`header-${day.code}`}
                          className={`rounded-xl border px-3 py-2 text-center ${
                            day.code === todayCode
                              ? 'border-red-200 bg-red-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="text-sm font-semibold text-slate-800">{day.label}</div>
                          <div className="text-[11px] text-slate-500">{day.entries.length} block{day.entries.length === 1 ? '' : 's'}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] gap-2">
                      <div className="relative" style={{ height: `${weeklyCalendarHeight}px` }}>
                        {weeklyTimeTicks.map((tick) => {
                          const topPercent = ((tick - weeklyTimelineStart) / Math.max(weeklyTimelineEnd - weeklyTimelineStart, 1)) * 100;
                          return (
                            <div
                              key={`tick-label-${tick}`}
                              className="absolute inset-x-0 -translate-y-1/2 text-right pr-2 text-[11px] text-slate-500"
                              style={{ top: `${topPercent}%` }}
                            >
                              {formatTime(tick)}
                            </div>
                          );
                        })}
                      </div>

                      {weeklyScheduleByDay.map((day) => (
                        <div
                          key={`column-${day.code}`}
                          className={`relative overflow-hidden rounded-2xl border ${
                            day.code === todayCode
                              ? 'border-red-200 bg-white shadow-[inset_0_0_0_1px_rgba(239,68,68,0.05)]'
                              : 'border-slate-200 bg-white'
                          }`}
                          style={{ height: `${weeklyCalendarHeight}px` }}
                        >
                          {weeklyTimeTicks.map((tick) => {
                            const topPercent = ((tick - weeklyTimelineStart) / Math.max(weeklyTimelineEnd - weeklyTimelineStart, 1)) * 100;
                            return (
                              <div
                                key={`${day.code}-grid-${tick}`}
                                className="absolute inset-x-0 border-t border-dashed border-slate-200"
                                style={{ top: `${topPercent}%` }}
                              />
                            );
                          })}

                          {day.entries.map(({ entry, start, end, laneIndex, laneCount }) => {
                            const topPercent = ((start - weeklyTimelineStart) / Math.max(weeklyTimelineEnd - weeklyTimelineStart, 1)) * 100;
                            const heightPercent = ((end - start) / Math.max(weeklyTimelineEnd - weeklyTimelineStart, 1)) * 100;
                            const laneWidthPercent = 100 / Math.max(laneCount, 1);
                            const blockWidthPercent = laneWidthPercent - 2;
                            const leftPercent = laneIndex * laneWidthPercent + 1;
                            const isCompactBlock = laneCount >= 3 || heightPercent < 10;
                            return (
                              <div
                                key={`${day.code}-${entry.id}`}
                                className={`absolute rounded-xl border px-2 py-1.5 shadow-sm ${courseBlockTone(entry.courseIdent || entry.sectionCode || 'COURSE')}`}
                                style={{
                                  top: `${Math.max(0, topPercent)}%`,
                                  height: `${Math.max(6, heightPercent)}%`,
                                  left: `${leftPercent}%`,
                                  width: `${Math.max(10, blockWidthPercent)}%`,
                                }}
                                title={`${entry.courseIdent} - ${entry.courseTitle || entry.catalogName || ''}`}
                              >
                                <div className="truncate text-[11px] font-semibold">
                                  {entry.courseIdent || entry.sectionCode || 'Course'}
                                </div>
                                <div className="truncate text-[10px] opacity-90">
                                  {formatTime(start)} - {formatTime(end)}
                                </div>
                                {!isCompactBlock && (
                                  <div className="truncate text-[10px] opacity-75">
                                    {entry.locations || entry.instructionalFormat || entry.deliveryMode || 'Scheduled'}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {showNowMarker && day.code === todayCode && (
                            <div
                              className="absolute inset-x-0 z-10 border-t-2 border-blue-500"
                              style={{ top: `${nowMarkerTopPercent}%` }}
                            >
                              <span className="absolute -top-2 left-2 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                Now
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
                  Imported schedule entries were found, but none included a timed weekly meeting pattern that could be placed on the calendar.
                </div>
              )}
            </div>
          )}

          {!loading && !error && scheduleEntries.length > 0 && (
            <div>
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
                Imported schedule details for {currentTerm} {currentYear}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {scheduleEntries.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">
                      {(entry.sectionCode && entry.sectionCode.length > 0 ? entry.sectionCode : entry.courseIdent || 'Course')}
                    </div>
                    <div className="mt-1 text-sm text-red-600">
                      {entry.courseTitle || entry.catalogName || 'Untitled course'}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      <div>
                        <span className="font-semibold">Meeting:</span>{' '}
                        {entry.meetingPatternRaw || 'No scheduled meeting pattern'}
                      </div>
                      {(entry.instructor || entry.deliveryMode) && (
                        <div>
                          <span className="font-semibold">Instructor/Mode:</span>{' '}
                          {[entry.instructor, entry.deliveryMode].filter(Boolean).join(' • ')}
                        </div>
                      )}
                      {entry.locations && (
                        <div>
                          <span className="font-semibold">Location:</span> {entry.locations}
                        </div>
                      )}
                      {(entry.freeDropDeadline || entry.withdrawDeadline) && (
                        <div>
                          <span className="font-semibold">Deadlines:</span>{' '}
                          {[entry.freeDropDeadline, entry.withdrawDeadline].filter(Boolean).join(' / ')}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && scheduleEntries.length === 0 && currentSemester && currentCourses.length > 0 && (
            <div>
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
                {currentTerm} {currentYear}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentCourses.map((course) => (
                  <article key={course.courseIdent} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">{course.courseIdent.replace('_', ' ')}</div>
                    <div className="mt-1 text-sm text-red-600">{course.name}</div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span>{course.credits} credits</span>
                      <span className={`rounded-full px-2 py-1 font-semibold ${statusClass(course.status)}`}>
                        {(course.status ? normalizeStatus(course.status).replace('_', ' ') : 'PLANNED')}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
