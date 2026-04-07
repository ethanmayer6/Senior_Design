import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/header';
import { logout } from '../utils/auth';
import { getFriends, type StudentSearchResult } from '../api/usersApi';
import { Badge } from '../components/Badge';
import FocusSafeModal from '../components/FocusSafeModal';
import { getCurrentClassSchedule, getCourseByIdent, type ClassScheduleEntry } from '../api/classScheduleApi';
import {
  getFlowchartInsights,
  type Course,
  type FlowchartInsights,
} from '../api/flowchartApi';
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
const HOME_SIDEBAR_SECTION_DEFS: Array<{
  id: string;
  title: string;
  collapsible?: boolean;
  moduleIds: string[];
}> = [
  {
    id: 'main',
    title: 'Main',
    moduleIds: ['flowchart-dashboard', 'smart-scheduler', 'course-catalog', 'majors-browse'],
  },
  {
    id: 'student',
    title: 'Student',
    moduleIds: [
      'current-classes',
      'friends-list',
      'student-search',
      'course-reviews',
      'professor-reviews',
      'course-badges',
    ],
  },
  {
    id: 'account',
    title: 'Account',
    moduleIds: ['profile', 'settings'],
  },
  {
    id: 'more',
    title: 'More',
    collapsible: true,
    moduleIds: ['games', 'dining', 'canvas', 'campus-map', 'log-out'],
  },
];

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

function getGreetingForHour(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function isCourseflowNavItem(value: CourseflowNavItem | undefined): value is CourseflowNavItem {
  return Boolean(value);
}

function getModuleCtaLabel(module: CourseflowNavItem): string {
  if (module.href) return 'Open link';
  if (module.action === 'friends') return 'View friends';
  if (module.id === 'smart-scheduler') return 'Build schedule';
  if (module.id === 'flowchart-dashboard') return 'Open dashboard';
  if (module.id === 'course-catalog') return 'Explore catalog';
  if (module.id === 'majors-browse') return 'Browse majors';
  return 'Open tool';
}

function formatRelativeMinutes(minutes: number): string {
  if (minutes <= 0) return 'now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
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
  const [flowchartInsights, setFlowchartInsights] = useState<FlowchartInsights | null>(null);
  const [degreeProgressLoading, setDegreeProgressLoading] = useState(true);
  const [hiddenModuleIds, setHiddenModuleIds] = useState<string[]>([]);
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);
  const [showModuleVisibilityModal, setShowModuleVisibilityModal] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const viewerProfile = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const rawUser = window.localStorage.getItem('user');
      if (!rawUser) return null;
      return JSON.parse(rawUser) as {
        firstName?: string;
        preferredName?: string;
        email?: string;
      };
    } catch {
      return null;
    }
  }, []);

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
    async function loadDegreeProgress() {
      setDegreeProgressLoading(true);
      try {
        const insights = await getFlowchartInsights();
        setFlowchartInsights(insights);
      } catch {
        setFlowchartInsights(null);
      } finally {
        setDegreeProgressLoading(false);
      }
    }
    void loadDegreeProgress();
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
        ? 'calc(100% - 1px)'
        : `calc(${nowPercent}% - 0.5px)`;
  const nowBadgeTransform =
    nowPercent <= 0 ? 'translateX(0)' : nowPercent >= 100 ? 'translateX(-100%)' : 'translateX(-50%)';

  const timeTicks = buildTimelineTicks(timelineStart, timelineEnd);
  const viewerName = useMemo(() => {
    const preferredName = viewerProfile?.preferredName?.trim();
    if (preferredName) return preferredName;
    const firstName = viewerProfile?.firstName?.trim();
    if (firstName) return firstName;
    const emailPrefix = viewerProfile?.email?.split('@')[0]?.trim();
    return emailPrefix || 'there';
  }, [viewerProfile]);
  const greetingHeading = `${getGreetingForHour(now)}, ${viewerName}`;
  const currentScheduleItem =
    todaysSchedule.find(({ start, end }) => (start as number) <= nowMinutes && (end as number) > nowMinutes) ?? null;
  const nextScheduleItem = todaysSchedule.find(({ end }) => (end as number) > nowMinutes) ?? null;
  const nextScheduleIsCurrent =
    nextScheduleItem !== null && (nextScheduleItem.start as number) <= nowMinutes && (nextScheduleItem.end as number) > nowMinutes;
  const completedItemsToday = todaysSchedule.filter(({ end }) => (end as number) <= nowMinutes).length;
  const remainingItemsToday = todaysSchedule.filter(({ end }) => (end as number) > nowMinutes);
  const upcomingItemsToday = todaysSchedule.filter(({ start }) => (start as number) > nowMinutes).length;
  const finalItemToday = todaysSchedule[todaysSchedule.length - 1] ?? null;
  const todayCoverage =
    todaysSchedule.length > 0
      ? `${formatScheduleTime(todaysSchedule[0].start as number)} to ${formatScheduleTime(finalItemToday?.end as number)}`
      : 'No timeline items yet';
  const liveTone = currentScheduleItem
    ? isCustomScheduleEntry(currentScheduleItem.entry)
      ? {
          pillClassName: 'bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.28)]',
          lineClassName: 'bg-blue-400',
          glowClassName: 'shadow-[0_0_0_4px_rgba(59,130,246,0.10)]',
        }
      : {
          pillClassName: 'bg-red-600 text-white shadow-[0_10px_30px_rgba(220,38,38,0.26)]',
          lineClassName: 'bg-red-400',
          glowClassName: 'shadow-[0_0_0_4px_rgba(239,68,68,0.11)]',
        }
    : {
        pillClassName: 'bg-slate-800 text-white shadow-[0_8px_20px_rgba(15,23,42,0.16)]',
        lineClassName: 'bg-slate-500',
        glowClassName: 'shadow-[0_0_0_4px_rgba(15,23,42,0.06)]',
      };
  const dayCompletionPercent =
    todaysSchedule.length > 0
      ? Math.round(((completedItemsToday + (currentScheduleItem ? 0.5 : 0)) / todaysSchedule.length) * 100)
      : 0;
  const degreeCompletedCredits = flowchartInsights?.completedCredits ?? 0;
  const degreeInProgressCredits = flowchartInsights?.inProgressCredits ?? 0;
  const degreeTotalCredits = flowchartInsights?.totalCredits ?? 0;
  const degreeCompletedWidthPercent =
    degreeTotalCredits > 0 ? Math.min((degreeCompletedCredits / degreeTotalCredits) * 100, 100) : 0;
  const degreeInProgressWidthPercent =
    degreeTotalCredits > 0
      ? Math.min((degreeInProgressCredits / degreeTotalCredits) * 100, Math.max(0, 100 - degreeCompletedWidthPercent))
      : 0;
  const timelineStatus = currentScheduleItem
    ? {
        className: isCustomScheduleEntry(currentScheduleItem.entry)
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-red-200 bg-red-50 text-red-700',
        label: 'Live now',
        detail: `${getScheduleEntryPrimaryLabel(currentScheduleItem.entry)} until ${formatScheduleTime(
          currentScheduleItem.end as number,
        )}`,
      }
    : nextScheduleItem
      ? {
          className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
          label: `Free until ${formatScheduleTime(nextScheduleItem.start as number)}`,
          detail: `Until ${formatScheduleTime(nextScheduleItem.start as number)} · ${getScheduleEntryPrimaryLabel(
            nextScheduleItem.entry,
          )}`,
        }
      : {
          className: 'border-slate-200 bg-white text-slate-600',
          label: 'Day is clear',
          detail: 'Nothing else is scheduled for today',
        };
  const heroStats = [
    {
      label: nextScheduleItem ? (nextScheduleIsCurrent ? 'Live status' : 'Next up') : 'Today',
      value: nextScheduleItem ? getScheduleEntryPrimaryLabel(nextScheduleItem.entry) : 'All clear',
      helper: nextScheduleItem
        ? nextScheduleIsCurrent
          ? `In progress until ${formatScheduleTime(nextScheduleItem.end as number)}`
          : ''
        : 'The rest of your day is clear.',
      meta: nextScheduleItem
        ? nextScheduleIsCurrent
          ? `${formatRelativeMinutes((nextScheduleItem.end as number) - nowMinutes)} remaining`
          : `${formatRelativeMinutes((nextScheduleItem.start as number) - nowMinutes)} until it starts`
        : 'Open evening ahead',
      icon: nextScheduleIsCurrent ? 'pi pi-bolt' : 'pi pi-play-circle',
      iconClassName: nextScheduleIsCurrent
        ? 'bg-red-50 text-red-600 ring-1 ring-red-100'
        : 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
      dotClassName: nextScheduleIsCurrent ? 'bg-red-500' : 'bg-amber-500',
    },
    {
      label: 'Today’s load',
      value: `${todaysSchedule.length} planned`,
      helper:
        todaysSchedule.length === 0
          ? 'No timed items are on your schedule yet.'
          : '',
      meta: todayCoverage,
      icon: 'pi pi-calendar',
      iconClassName: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
      dotClassName: 'bg-sky-500',
    },
    {
      label: 'Still ahead',
      value: remainingItemsToday.length > 0 ? `${remainingItemsToday.length} remaining` : 'Wrapped up',
      helper:
        remainingItemsToday.length === 0
          ? 'You do not have any more timed items today.'
          : remainingItemsToday.length === 1
            ? ''
            : `${remainingItemsToday.length - (currentScheduleItem ? 1 : 0)} more ${
                remainingItemsToday.length - (currentScheduleItem ? 1 : 0) === 1 ? 'item is' : 'items are'
              } still ahead after the current block.`,
      meta:
        finalItemToday && remainingItemsToday.length > 0
          ? `Clear after ${formatScheduleTime(finalItemToday.end as number)}`
          : 'Nothing else to chase down tonight',
      icon: 'pi pi-flag',
      iconClassName: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
      dotClassName: remainingItemsToday.length > 0 ? 'bg-emerald-500' : 'bg-slate-400',
    },
  ];
  const heroStatCards = heroStats.map((stat, index) => {
    if (index === 0) {
      return {
        ...stat,
        id: 'next',
        miniSegments: [] as Array<{ value: number; className: string; label: string }>,
      };
    }

    if (index === 1) {
      return {
        ...stat,
        id: 'load',
        label: "Today's load",
        miniSegments: [
          { value: completedItemsToday, className: 'bg-emerald-500', label: `${completedItemsToday} done` },
          { value: currentScheduleItem ? 1 : 0, className: 'bg-red-500', label: currentScheduleItem ? '1 live' : 'No live item' },
          { value: upcomingItemsToday, className: 'bg-sky-500', label: `${upcomingItemsToday} upcoming` },
        ],
      };
    }

    return {
      ...stat,
      id: 'remaining',
      meta:
        todaysSchedule.length > 0
          ? `Day ${dayCompletionPercent}% complete`
          : stat.meta,
      miniSegments: [
        { value: completedItemsToday, className: 'bg-slate-900', label: `${completedItemsToday} finished` },
        { value: remainingItemsToday.length, className: 'bg-emerald-500', label: `${remainingItemsToday.length} left` },
      ],
    };
  });

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

  const sidebarSections = HOME_SIDEBAR_SECTION_DEFS.map((section) => ({
    ...section,
    modules: section.moduleIds
      .map((moduleId) => quickActionModules.find((module) => module.id === moduleId))
      .filter(isCourseflowNavItem),
  })).filter((section) => section.modules.length > 0);

  const walkthroughModules = courseflowNavItems.filter((module) => module.id !== 'log-out');

  const moduleCardBody = (module: CourseflowNavItem) => (
    <div className="flex h-full flex-col">
      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {module.image ? (
          <img
            src={module.image}
            alt={`${module.title} illustration`}
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-white to-slate-100">
            <i className={`${module.icon} text-4xl text-red-500`} aria-hidden="true" />
          </div>
        )}
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{module.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-red-600">
        {getModuleCtaLabel(module)}
        <i className="pi pi-arrow-right text-xs" />
      </div>
    </div>
  );

  const renderQuickAction = (module: CourseflowNavItem, active = false) => {
    const baseClassName = active
      ? 'group flex w-full items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm font-semibold text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.12)] transition hover:bg-red-100'
      : 'group flex w-full items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900';
    const iconClassName = active
      ? 'flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white'
      : 'flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-500 transition group-hover:text-red-500';
    const content = (
      <>
        <span className={iconClassName}>
          <i className={module.icon}></i>
        </span>
        <span className="flex-1">{module.title}</span>
        {!active && <i className="pi pi-angle-right text-[10px] text-slate-300 transition group-hover:text-red-400"></i>}
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
    <div className="min-h-screen bg-[#eef2f7]">
      <Header />

      <main className="px-3 pb-12 pt-16 sm:px-5 lg:px-6">
        <div className="mx-auto grid w-full max-w-[1820px] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-stretch">
          <section className="mx-auto flex h-full w-full max-w-none flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.25rem]">
                    {greetingHeading}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-[15px] text-slate-700">
                    Here&apos;s your schedule and planning tools for today.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {heroStatCards.map((stat) => (
                  <div
                    key={stat.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.iconClassName}`}>
                        <i className={stat.icon} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{stat.label}</div>
                        <div className="mt-1.5 text-[1.35rem] font-semibold leading-tight text-slate-900">{stat.value}</div>
                      </div>
                    </div>
                    {stat.helper ? <div className="mt-3 text-sm leading-6 text-slate-700">{stat.helper}</div> : null}
                    <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span className={`h-2 w-2 rounded-full ${stat.dotClassName}`} />
                      <span>{stat.meta}</span>
                    </div>
                    {stat.miniSegments.length > 0 && (
                      <>
                        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                          {stat.miniSegments.map((segment) => (
                            <span
                              key={`${stat.id}-${segment.label}`}
                              className={segment.className}
                              style={{
                                width: `${(segment.value / Math.max(1, stat.id === 'remaining' ? completedItemsToday + remainingItemsToday.length : todaysSchedule.length)) * 100}%`,
                              }}
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {stat.miniSegments.map((segment) => (
                            <span key={`${segment.label}-legend`} className="inline-flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${segment.className}`} />
                              {segment.label}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-[#f3f7fb] p-4 sm:p-5">
                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Today&apos;s timeline</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${timelineStatus.className}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                    <span>{timelineStatus.label}</span>
                    <span className="hidden opacity-80 sm:inline">
                      {currentScheduleItem
                        ? `${getScheduleEntryPrimaryLabel(currentScheduleItem.entry)} until ${formatScheduleTime(currentScheduleItem.end as number)}`
                        : nextScheduleItem
                          ? `Next: ${getScheduleEntryPrimaryLabel(nextScheduleItem.entry)}`
                          : timelineStatus.detail}
                    </span>
                  </div>
                </div>

                <div className="relative mt-4 rounded-[24px] border border-slate-200 bg-[#fbfcfe] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="relative h-28 overflow-hidden rounded-2xl bg-slate-50">
                    <div className="pointer-events-none absolute inset-0">
                      {timeTicks.map((tick) => {
                        const tickPercent = ((tick - timelineStart) / (timelineEnd - timelineStart)) * 100;
                        return (
                          <div
                            key={`grid-${tick}`}
                            className="absolute bottom-0 top-0 border-l border-slate-200"
                            style={{ left: `${tickPercent}%` }}
                          />
                        );
                      })}
                    </div>
                    <div
                      className={`absolute -top-1 z-10 rounded-full px-2.5 py-0.5 text-[0px] font-semibold tracking-wide ${liveTone.pillClassName}`}
                      style={{ left: `${nowPercent}%`, transform: nowBadgeTransform }}
                    >
                      <span className="text-[9px]">Now {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                      Now · {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  {todaysSchedule.map(({ entry, start, end }) => {
                    const left = (((start as number) - timelineStart) / (timelineEnd - timelineStart)) * 100;
                    const width = (((end as number) - (start as number)) / (timelineEnd - timelineStart)) * 100;
                    const slotWidth = Math.max(5, width);
                    const isActive = (start as number) <= nowMinutes && (end as number) > nowMinutes;
                    const isCustom = isCustomScheduleEntry(entry);
                    const useStackedTime = slotWidth < 12;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          void openTimelineCourse(entry);
                        }}
                        className={`absolute bottom-3 top-6 overflow-hidden rounded-2xl border px-2.5 py-2 text-left text-[10px] font-semibold leading-tight transition ${
                          isActive
                            ? isCustom
                              ? 'border-blue-500 bg-blue-600 text-white shadow-[0_16px_30px_rgba(37,99,235,0.28)]'
                              : 'border-red-500 bg-red-600 text-white shadow-[0_16px_30px_rgba(220,38,38,0.24)]'
                            : isCustom
                              ? 'border-blue-200 bg-blue-50 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:bg-blue-100'
                              : 'border-red-200 bg-red-50 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:bg-red-100'
                        }`}
                        style={{ left: `${Math.max(0, left)}%`, width: `${slotWidth}%`, minWidth: '92px' }}
                        title={`${getScheduleEntryPrimaryLabel(entry)} - ${getScheduleEntrySecondaryLabel(entry)}`}
                      >
                        <div className="truncate">{getScheduleEntryPrimaryLabel(entry)}</div>
                        {useStackedTime ? (
                          <div className={`mt-1 flex flex-col gap-0.5 text-[8px] font-medium leading-[1.15] ${isActive ? 'text-white/80' : 'text-slate-600'}`}>
                            <span className="truncate">{formatScheduleTime(start as number)}</span>
                            <span className="truncate">{formatScheduleTime(end as number)}</span>
                          </div>
                        ) : (
                          <div className={`mt-1 truncate text-[9px] font-medium ${isActive ? 'text-white/80' : 'text-slate-600'}`}>
                            {formatScheduleTime(start as number)} - {formatScheduleTime(end as number)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                    <div
                      className={`absolute bottom-0 top-0 z-[1] w-px ${liveTone.lineClassName} ${liveTone.glowClassName}`}
                      style={{ left: nowLineLeft }}
                    />
                  </div>
                  <div className="relative mt-3 h-4 text-[11px] font-semibold text-slate-600">
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
                    <p className="mt-3 text-sm text-slate-500">
                      No timed schedule items found for today. Add a class import or custom event on Current Classes if needed.
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Degree progress</div>
                  {degreeProgressLoading ? (
                    <div className="h-3 animate-pulse rounded-full bg-slate-100" />
                  ) : (
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      {flowchartInsights ? (
                        <div className="flex h-full">
                          <span className="bg-slate-900" style={{ width: `${degreeCompletedWidthPercent}%` }} />
                          <span className="bg-red-400" style={{ width: `${degreeInProgressWidthPercent}%` }} />
                        </div>
                      ) : (
                        <span className="block h-full w-full bg-slate-200" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>

            <div className="mt-8 flex-1 space-y-8">
              {groupedVisibleModules.map(({ group, modules }) => (
                <section key={group.id}>
                  <div className="mb-4">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{group.title}</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-600">{group.description}</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {modules.map((module) => {
                      const commonClassName =
                        'group block h-full rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-red-200 hover:shadow-[0_20px_40px_rgba(15,23,42,0.10)]';

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
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  No modules selected. Use Module Visibility above to show cards again.
                </div>
              )}
            </div>
          </section>

          <aside className="hidden max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-[26px] border border-slate-200 bg-white/80 p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-sm lg:sticky lg:top-20 lg:block">
            <p className="mb-3 text-sm font-semibold text-slate-900">Quick actions</p>

            {renderQuickAction(
              {
                id: 'home',
                groupId: 'MORE',
                title: 'Home',
                description: '',
                icon: 'pi pi-home',
                to: '/courseflow',
              },
              true,
            )}

            <div className="mt-4 space-y-4">
              {sidebarSections.map((section) => (
                <section key={section.id}>
                  <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {section.title}
                  </div>
                  {section.collapsible ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsMoreExpanded((current) => !current)}
                        className="flex w-full items-center justify-between rounded-2xl bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        aria-expanded={isMoreExpanded}
                      >
                        <span>More tools</span>
                        <i
                          className={`pi ${isMoreExpanded ? 'pi-chevron-up' : 'pi-chevron-down'} text-[10px] text-slate-400`}
                        />
                      </button>
                      {isMoreExpanded && (
                        <div className="mt-2 space-y-1">
                          {section.modules.map((module) => renderQuickAction(module))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1">
                      {section.modules.map((module) => renderQuickAction(module))}
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
