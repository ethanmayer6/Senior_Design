import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/header';
import { logout } from '../utils/auth';
import { getFriends, type StudentSearchResult } from '../api/usersApi';
import { Badge } from '../components/Badge';
import FocusSafeModal from '../components/FocusSafeModal';
import { getCurrentClassSchedule, getCourseByIdent, type ClassScheduleEntry } from '../api/classScheduleApi';
import type { Course } from '../api/flowchartApi';
import {
  courseflowNavGroups,
  courseflowNavItems,
  type CourseflowNavItem,
} from '../config/courseflowNavigation';
import {
  loadHiddenCourseflowModuleIds,
  saveHiddenCourseflowModuleIds,
} from '../utils/courseflowModuleVisibility';
import {
  entryOccursOnDate,
  formatScheduleTime,
  getScheduleEntryPrimaryLabel,
  getScheduleEntrySecondaryLabel,
  isCustomScheduleEntry,
  parseScheduleMinutes,
} from '../utils/classSchedule';
import { buildBadgePreviewCourse, formatBadgeCourseIdent } from '../utils/courseBadge';

const HOME_WALKTHROUGH_KEY_PREFIX = 'courseflow_home_walkthrough_seen';

function buildTimelineTicks(start: number, end: number): number[] {
  const duration = Math.max(end - start, 1);
  const step = duration > 12 * 60 ? 180 : 120;
  const ticks: number[] = [];

  for (let minute = start; minute <= end; minute += step) {
    ticks.push(minute);
  }

  if (ticks[ticks.length - 1] !== end) {
    ticks.push(end);
  }

  return ticks;
}

function normalizeAccentColor(value?: string | null): string {
  return /^#[a-fA-F0-9]{6}$/.test(value ?? '') ? String(value).toLowerCase() : '#dc2626';
}

function formatPhoneNumber(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

function getFriendInitials(friend: StudentSearchResult): string {
  const first = friend.firstName?.[0] ?? friend.displayName?.[0] ?? '';
  const last = friend.lastName?.[0] ?? '';
  return `${first}${last}`.trim().toUpperCase() || 'FR';
}

export default function CourseflowHome() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<StudentSearchResult[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<StudentSearchResult | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ClassScheduleEntry[]>([]);
  const [now, setNow] = useState<Date>(new Date());
  const [selectedTimelineEntry, setSelectedTimelineEntry] = useState<ClassScheduleEntry | null>(null);
  const [selectedTimelineCourse, setSelectedTimelineCourse] = useState<Course | null>(null);
  const [timelineDetailsLoading, setTimelineDetailsLoading] = useState(false);
  const [hiddenModuleIds, setHiddenModuleIds] = useState<string[]>([]);
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);
  const [showModuleVisibilityModal, setShowModuleVisibilityModal] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    async function loadFriends() {
      setFriendsLoading(true);
      try {
        const friendList = await getFriends();
        setFriends(friendList);
      } catch {
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    }
    void loadFriends();
  }, []);

  useEffect(() => {
    async function loadSchedule() {
      try {
        const rows = await getCurrentClassSchedule();
        setScheduleEntries(rows);
      } catch {
        setScheduleEntries([]);
      }
    }
    void loadSchedule();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setHiddenModuleIds(loadHiddenCourseflowModuleIds());
  }, []);

  useEffect(() => {
    saveHiddenCourseflowModuleIds(hiddenModuleIds);
  }, [hiddenModuleIds]);

  useEffect(() => {
    try {
      const rawUser = window.localStorage.getItem('user');
      if (!rawUser) return;

      const parsed: unknown = JSON.parse(rawUser);
      if (!parsed || typeof parsed !== 'object') return;

      const userRecord = parsed as { id?: number | string; email?: string; role?: string };
      const role = (userRecord.role || '').toUpperCase();
      if (role !== 'USER' && role !== 'STUDENT') return;

      const identity = userRecord.id ?? userRecord.email;
      const storageKey = identity
        ? `${HOME_WALKTHROUGH_KEY_PREFIX}_${String(identity)}`
        : HOME_WALKTHROUGH_KEY_PREFIX;

      if (window.localStorage.getItem(storageKey) === 'true') return;

      window.localStorage.setItem(storageKey, 'true');
      setShowWalkthrough(true);
    } catch {
      setShowWalkthrough(false);
    }
  }, []);

  const formatIsoTime = (timeValue: string | null | undefined): string => {
    const minutes = parseScheduleMinutes(timeValue ?? null);
    if (minutes === null) return 'TBD';
    return formatScheduleTime(minutes);
  };

  const openTimelineCourse = async (entry: ClassScheduleEntry) => {
    setSelectedTimelineEntry(entry);
    setSelectedTimelineCourse(null);
    if (!entry.courseIdent || isCustomScheduleEntry(entry)) return;
    setTimelineDetailsLoading(true);
    try {
      const details = await getCourseByIdent(entry.courseIdent);
      setSelectedTimelineCourse(details);
    } catch {
      setSelectedTimelineCourse(null);
    } finally {
      setTimelineDetailsLoading(false);
    }
  };

  const todaysSchedule = scheduleEntries
    .filter((entry) => entryOccursOnDate(entry, now))
    .map((entry) => {
      const start = parseScheduleMinutes(entry.meetingStartTime);
      const end = parseScheduleMinutes(entry.meetingEndTime);
      return { entry, start, end };
    })
    .filter((x) => x.start !== null && x.end !== null && (x.end as number) > (x.start as number))
    .sort((a, b) => (a.start as number) - (b.start as number));

  const timelineStart = 7 * 60;
  const timelineEnd = 22 * 60;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const clampedNow = Math.max(timelineStart, Math.min(timelineEnd, nowMinutes));
  const nowPercent = ((clampedNow - timelineStart) / (timelineEnd - timelineStart)) * 100;
  const nowLineLeft =
    nowPercent <= 0
      ? '0px'
      : nowPercent >= 100
        ? 'calc(100% - 2px)'
        : `calc(${nowPercent}% - 1px)`;

  const timeTicks = buildTimelineTicks(timelineStart, timelineEnd);

  const toggleModuleVisibility = (moduleId: string) => {
    setHiddenModuleIds((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId],
    );
  };

  const runModuleAction = (module: CourseflowNavItem) => {
    if (module.action === 'friends') {
      setShowFriendsList(true);
      return;
    }
    if (module.action === 'logout') {
      handleLogout();
    }
  };

  const visibleModules = courseflowNavItems.filter((module) => !hiddenModuleIds.includes(module.id));
  const groupedVisibleModules = courseflowNavGroups
    .map((group) => ({
      group,
      modules: visibleModules.filter((module) => module.groupId === group.id),
    }))
    .filter((entry) => entry.modules.length > 0);

  const groupedAllModules = courseflowNavGroups
    .map((group) => ({
      group,
      modules: courseflowNavItems.filter((module) => module.groupId === group.id),
    }))
    .filter((entry) => entry.modules.length > 0);

  const quickActionModules = courseflowNavItems.map((module) =>
    module.id === 'profile' || module.id === 'student-search'
      ? { ...module, groupId: 'MORE' as const }
      : module,
  );

  const groupedQuickActionModules = courseflowNavGroups
    .map((group) => ({
      group,
      modules: quickActionModules.filter((module) => module.groupId === group.id),
    }))
    .filter((entry) => entry.modules.length > 0);

  const walkthroughModules = courseflowNavItems.filter((module) => module.id !== 'log-out');

  const moduleCardBody = (module: CourseflowNavItem) => (
    <>
      <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-slate-50">
        {module.image ? (
          <img
            src={module.image}
            alt={`${module.title} illustration`}
            className="h-36 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-36 items-center justify-center bg-gradient-to-br from-red-50 to-slate-100">
            <i className={`${module.icon} text-4xl text-red-500`} aria-hidden="true" />
          </div>
        )}
      </div>
      <h2 className="text-xl font-semibold text-gray-800">{module.title}</h2>
      <p className="mt-2 text-sm text-gray-600">{module.description}</p>
    </>
  );

  const renderQuickAction = (module: CourseflowNavItem) => {
    const baseClassName =
      'block w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-left text-[13px] font-medium leading-tight text-gray-700 transition hover:border-red-300 hover:bg-red-50';
    const content = (
      <>
        <i className={`${module.icon} mr-1.5 text-red-500`}></i>
        {module.title}
      </>
    );

    if (module.to) {
      return (
        <Link key={module.id} to={module.to} className={baseClassName}>
          {content}
        </Link>
      );
    }

    if (module.href) {
      return (
        <a
          key={module.id}
          href={module.href}
          target="_blank"
          rel="noreferrer"
          className={baseClassName}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        key={module.id}
        type="button"
        onClick={() => runModuleAction(module)}
        className={baseClassName}
      >
        {content}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="px-3 pb-10 pt-24 sm:px-5 lg:px-6">
        <div className="mx-auto grid w-full max-w-[1820px] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="mx-auto w-full max-w-none">
            <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Today Timeline</p>
                  <h2 className="text-sm font-semibold text-gray-800">
                    {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h2>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-gray-700">
                  {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>

              <div className="relative mt-4 rounded-xl border border-gray-200 bg-slate-50 p-3">
                <div className="relative h-16 overflow-hidden rounded-lg bg-white">
                  {todaysSchedule.map(({ entry, start, end }) => {
                    const left = (((start as number) - timelineStart) / (timelineEnd - timelineStart)) * 100;
                    const width = (((end as number) - (start as number)) / (timelineEnd - timelineStart)) * 100;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          void openTimelineCourse(entry);
                        }}
                        className={`absolute bottom-2 top-2 rounded-md border px-2 py-1 text-left text-[11px] font-semibold text-gray-700 transition ${
                          isCustomScheduleEntry(entry)
                            ? 'border-blue-300 bg-blue-100 hover:bg-blue-200'
                            : 'border-red-300 bg-red-100 hover:bg-red-200'
                        }`}
                        style={{ left: `${Math.max(0, left)}%`, width: `${Math.max(4, width)}%` }}
                        title={`${getScheduleEntryPrimaryLabel(entry)} - ${getScheduleEntrySecondaryLabel(entry)}`}
                      >
                        <div className="truncate">{getScheduleEntryPrimaryLabel(entry)}</div>
                        <div className="truncate text-[10px] font-normal text-gray-600">
                          {formatScheduleTime(start as number)} - {formatScheduleTime(end as number)}
                        </div>
                      </button>
                    );
                  })}
                  <div className="absolute bottom-0 top-0 w-0.5 bg-blue-500" style={{ left: nowLineLeft }} />
                </div>
                <div className="relative mt-2 h-4 text-[10px] text-gray-500">
                  {timeTicks.map((tick, index) => {
                    const tickPercent = ((tick - timelineStart) / (timelineEnd - timelineStart)) * 100;
                    const transform =
                      index === 0 ? 'translateX(0)' : index === timeTicks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';

                    return (
                      <span
                        key={tick}
                        className="absolute top-0 whitespace-nowrap"
                        style={{ left: `${tickPercent}%`, transform }}
                      >
                        {formatScheduleTime(tick)}
                      </span>
                    );
                  })}
                </div>
                {todaysSchedule.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    No timed schedule items found for today. Add a class import or custom event on Current Classes if needed.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {groupedVisibleModules.map(({ group, modules }) => (
                <section key={group.id}>
                  <div className="mb-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">
                      {group.title}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{group.description}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {modules.map((module) => {
                      const commonClassName =
                        'group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-md';

                      if (module.to) {
                        return (
                          <Link key={module.id} to={module.to} className={commonClassName}>
                            {moduleCardBody(module)}
                          </Link>
                        );
                      }

                      if (module.href) {
                        return (
                          <a
                            key={module.id}
                            href={module.href}
                            target="_blank"
                            rel="noreferrer"
                            className={commonClassName}
                          >
                            {moduleCardBody(module)}
                          </a>
                        );
                      }

                      return (
                        <button
                          key={module.id}
                          type="button"
                          onClick={() => runModuleAction(module)}
                          className={`${commonClassName} w-full text-left`}
                        >
                          {moduleCardBody(module)}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              {visibleModules.length === 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                  No modules selected. Use Module Visibility above to show cards again.
                </div>
              )}
            </div>
          </section>

          <aside className="hidden max-h-[calc(100vh-7.5rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-sm lg:sticky lg:top-28 lg:block">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Quick Actions</p>

            <Link
              to="/courseflow"
              className="block w-full rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-left text-[13px] font-semibold leading-tight text-gray-700 transition hover:border-red-300 hover:bg-red-100"
            >
              <i className="pi pi-home mr-1.5 text-red-500"></i>
              Home
            </Link>

            <div className="mt-3 space-y-2.5">
              {groupedQuickActionModules.map(({ group, modules }) => (
                <section key={group.id}>
                  {group.id === 'MORE' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsMoreExpanded((current) => !current)}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-slate-50 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 transition hover:border-red-200 hover:bg-red-50"
                        aria-expanded={isMoreExpanded}
                      >
                        <span>{group.title}</span>
                        <i
                          className={`pi ${isMoreExpanded ? 'pi-chevron-up' : 'pi-chevron-down'} text-[10px] text-red-500`}
                        />
                      </button>
                      {isMoreExpanded && (
                        <div className="mt-1.5 space-y-1.5">
                          {modules.map((module) => renderQuickAction(module))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      {modules.map((module) => renderQuickAction(module))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <FocusSafeModal
        open={showWalkthrough}
        onClose={() => setShowWalkthrough(false)}
        title="Welcome to CourseFlow"
        maxWidthClass="max-w-4xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Welcome to CourseFlow</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-800">Here is a quick look at what you can do.</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowWalkthrough(false)}
            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:border-red-300 hover:bg-red-50"
          >
            Close
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          This home page is your launch point for the app. We only show this overview once so you can get oriented fast.
        </p>

        <div className="mt-5 grid max-h-[28rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {walkthroughModules.map((module) => (
            <div key={module.id} className="rounded-xl border border-gray-200 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-red-500 shadow-sm">
                  <i className={`${module.icon} text-lg`} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{module.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-gray-600">{module.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setShowWalkthrough(false)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Start Exploring
          </button>
        </div>
      </FocusSafeModal>

      <FocusSafeModal
        open={showModuleVisibilityModal}
        onClose={() => setShowModuleVisibilityModal(false)}
        title="Module Visibility"
        maxWidthClass="max-w-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-800">Module Visibility</h3>
          <button
            type="button"
            onClick={() => setShowModuleVisibilityModal(false)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 transition hover:border-red-300 hover:bg-red-50"
          >
            Close
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">Toggle which cards appear on your home screen.</p>
        <div className="mt-4 space-y-4">
          {groupedAllModules.map(({ group, modules }) => (
            <section key={group.id}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                {group.title}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {modules.map((module) => (
                  <label
                    key={module.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-xs font-medium text-gray-700"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-red-600"
                      checked={!hiddenModuleIds.includes(module.id)}
                      onChange={() => toggleModuleVisibility(module.id)}
                    />
                    <span>{module.title}</span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setHiddenModuleIds([])}
            disabled={hiddenModuleIds.length === 0}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Show All
          </button>
        </div>
      </FocusSafeModal>

      <FocusSafeModal
        open={showFriendsList}
        onClose={() => setShowFriendsList(false)}
        title="Friends List"
        maxWidthClass="max-w-lg"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-800">Your Friends</h3>
          <Link
            to="/student-search"
            onClick={() => setShowFriendsList(false)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
          >
            <i className="pi pi-user-plus mr-1 text-red-500"></i>
            Add
          </Link>
        </div>
        <div className="mt-4">
          {friendsLoading ? (
            <div className="text-sm text-gray-500">Loading friends...</div>
          ) : friends.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              No friends added yet.
            </div>
          ) : (
            <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
              {friends.map((friend) => (
                (() => {
                  const friendBadge = buildBadgePreviewCourse(friend.selectedBadgeCourseIdent);
                  const accentColor = normalizeAccentColor(friend.accentColor);
                  const fullName = `${friend.firstName || ''} ${friend.lastName || ''}`.trim();
                  const displayName = friend.displayName || friend.username;

                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => {
                        setShowFriendsList(false);
                        setSelectedFriend(friend);
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-red-300 hover:bg-red-50"
                    >
                      <div className="flex items-start gap-3">
                        {friend.profilePictureUrl ? (
                          <img
                            src={friend.profilePictureUrl}
                            alt={`${displayName} profile`}
                            className="h-12 w-12 rounded-full border border-gray-200 object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {getFriendInitials(friend)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-800">{displayName}</div>
                          {fullName && displayName !== fullName && (
                            <div className="mt-0.5 text-xs text-gray-500">{fullName}</div>
                          )}
                          <div className="mt-1 text-xs text-gray-500">{friend.username}</div>
                          {friend.profileHeadline && (
                            <div className="mt-2 text-xs font-medium text-gray-700">{friend.profileHeadline}</div>
                          )}
                          {friend.major && <div className="mt-1 text-xs text-gray-500">Major: {friend.major}</div>}
                          {friendBadge && (
                            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                              <Badge course={friendBadge} size={42} />
                              <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Featured Badge
                                </div>
                                <div className="truncate text-xs font-semibold text-slate-800">
                                  {formatBadgeCourseIdent(friend.selectedBadgeCourseIdent)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })()
              ))}
            </div>
          )}
        </div>
      </FocusSafeModal>

      <FocusSafeModal
        open={selectedFriend !== null}
        onClose={() => setSelectedFriend(null)}
        title="Friend Profile"
        maxWidthClass="max-w-md"
      >
        {selectedFriend && (
          (() => {
            const accentColor = normalizeAccentColor(selectedFriend.accentColor);
            const friendBadge = buildBadgePreviewCourse(selectedFriend.selectedBadgeCourseIdent);
            const fullName = `${selectedFriend.firstName || ''} ${selectedFriend.lastName || ''}`.trim();
            const displayName = selectedFriend.displayName || selectedFriend.username;
            const visibleFields = [
              selectedFriend.major ? `Major: ${selectedFriend.major}` : null,
              selectedFriend.email ? `Email: ${selectedFriend.email}` : null,
              formatPhoneNumber(selectedFriend.phone) ? `Phone: ${formatPhoneNumber(selectedFriend.phone)}` : null,
            ].filter((value): value is string => Boolean(value));

            return (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-gray-800">Friend Profile</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedFriend(null)}
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 transition hover:border-red-300 hover:bg-red-50"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-2" style={{ backgroundColor: accentColor }} />
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {selectedFriend.profilePictureUrl ? (
                        <img
                          src={selectedFriend.profilePictureUrl}
                          alt={`${displayName} profile`}
                          className="h-20 w-20 rounded-full border border-gray-200 object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-20 w-20 items-center justify-center rounded-full text-lg font-semibold text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          {getFriendInitials(selectedFriend)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-slate-900">{displayName}</div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {selectedFriend.username}
                          </span>
                        </div>
                        {fullName && displayName !== fullName && (
                          <div className="mt-1 text-sm text-slate-500">{fullName}</div>
                        )}
                        {selectedFriend.profileHeadline && (
                          <div className="mt-2 text-sm font-medium text-slate-700">
                            {selectedFriend.profileHeadline}
                          </div>
                        )}
                      </div>
                    </div>

                    {visibleFields.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {visibleFields.map((field) => (
                          <span
                            key={field}
                            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    )}

                    {friendBadge && (
                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <Badge course={friendBadge} size={58} />
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Featured Course Badge
                          </div>
                          <div className="text-sm font-semibold text-slate-800">
                            {formatBadgeCourseIdent(selectedFriend.selectedBadgeCourseIdent)}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedFriend.bio ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                        {selectedFriend.bio}
                      </div>
                    ) : (
                      visibleFields.length === 0 &&
                      !friendBadge &&
                      !selectedFriend.profileHeadline && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                          No extra profile details are shared yet.
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            );
          })()
        )}
      </FocusSafeModal>

      <FocusSafeModal
        open={selectedTimelineEntry !== null}
        onClose={() => {
          setSelectedTimelineEntry(null);
          setSelectedTimelineCourse(null);
          setTimelineDetailsLoading(false);
        }}
        title="Schedule Details"
        maxWidthClass="max-w-2xl"
      >
        {selectedTimelineEntry && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-gray-200 bg-slate-50 p-3">
              <div className="text-base font-semibold text-gray-800">
                {getScheduleEntryPrimaryLabel(selectedTimelineEntry)}
              </div>
              <div className="mt-1 text-gray-700">
                {getScheduleEntrySecondaryLabel(selectedTimelineEntry)}
              </div>
              <div className="mt-2 grid gap-2 text-xs text-gray-700 sm:grid-cols-2">
                <div>
                  <span className="font-semibold">Meeting:</span>{' '}
                  {selectedTimelineEntry.meetingPatternRaw || 'TBD'}
                </div>
                <div>
                  <span className="font-semibold">Time:</span>{' '}
                  {formatIsoTime(selectedTimelineEntry.meetingStartTime)} -{' '}
                  {formatIsoTime(selectedTimelineEntry.meetingEndTime)}
                </div>
                <div>
                  <span className="font-semibold">
                    {isCustomScheduleEntry(selectedTimelineEntry) ? 'Event Date:' : 'Instructor:'}
                  </span>{' '}
                  {isCustomScheduleEntry(selectedTimelineEntry)
                    ? selectedTimelineEntry.customEventDate || 'TBD'
                    : selectedTimelineEntry.instructor || 'TBD'}
                </div>
                <div>
                  <span className="font-semibold">
                    {isCustomScheduleEntry(selectedTimelineEntry) ? 'Type:' : 'Mode:'}
                  </span>{' '}
                  {isCustomScheduleEntry(selectedTimelineEntry)
                    ? 'Personal calendar item'
                    : selectedTimelineEntry.deliveryMode || 'TBD'}
                </div>
                <div>
                  <span className="font-semibold">Location:</span>{' '}
                  {selectedTimelineEntry.locations || 'TBD'}
                </div>
                <div>
                  <span className="font-semibold">
                    {isCustomScheduleEntry(selectedTimelineEntry) ? 'Notes:' : 'Format:'}
                  </span>{' '}
                  {isCustomScheduleEntry(selectedTimelineEntry)
                    ? selectedTimelineEntry.customEventNotes || 'TBD'
                    : selectedTimelineEntry.instructionalFormat || 'TBD'}
                </div>
                <div>
                  <span className="font-semibold">Free Drop:</span>{' '}
                  {selectedTimelineEntry.freeDropDeadline || 'TBD'}
                </div>
                <div>
                  <span className="font-semibold">Withdraw:</span>{' '}
                  {selectedTimelineEntry.withdrawDeadline || 'TBD'}
                </div>
              </div>
            </div>

            {timelineDetailsLoading && <div className="text-xs text-gray-500">Loading catalog details...</div>}

            {!timelineDetailsLoading && selectedTimelineCourse && (
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-sm font-semibold text-gray-800">
                  Catalog: {selectedTimelineCourse.courseIdent.replace('_', ' ')}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  Credits: {selectedTimelineCourse.credits} | Offered:{' '}
                  {selectedTimelineCourse.offered || 'TBD'} | Hours:{' '}
                  {selectedTimelineCourse.hours || 'TBD'}
                </div>
                <div className="mt-2 text-xs text-gray-700">
                  <span className="font-semibold">Prerequisite Text:</span>{' '}
                  {selectedTimelineCourse.prereq_txt || 'None'}
                </div>
                <div className="mt-1 text-xs text-gray-700">
                  <span className="font-semibold">Prerequisites:</span>{' '}
                  {selectedTimelineCourse.prerequisites?.length
                    ? selectedTimelineCourse.prerequisites.join(', ')
                    : 'None'}
                </div>
                <div className="mt-2 text-xs text-gray-700">
                  <span className="font-semibold">Description:</span>{' '}
                  {selectedTimelineCourse.description || 'No description.'}
                </div>
              </div>
            )}
          </div>
        )}
      </FocusSafeModal>
    </div>
  );
}
