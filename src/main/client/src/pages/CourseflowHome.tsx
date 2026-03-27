import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/header';
import { logout } from '../utils/auth';
import { getFriends, type StudentSearchResult } from '../api/usersApi';
import FocusSafeModal from '../components/FocusSafeModal';
import { getCurrentClassSchedule, getCourseByIdent, type ClassScheduleEntry } from '../api/classScheduleApi';
import type { Course } from '../api/flowchartApi';

type HomeModuleAction = 'friends' | 'logout';

type HomeModule = {
  id: string;
  title: string;
  description: string;
  icon: string;
  to?: string;
  href?: string;
  image?: string;
  action?: HomeModuleAction;
};

const HOME_MODULE_VISIBILITY_KEY = 'courseflow_home_hidden_modules';
const HOME_WALKTHROUGH_KEY_PREFIX = 'courseflow_home_walkthrough_seen';

const homeModules: HomeModule[] = [
  {
    id: 'flowchart-dashboard',
    title: 'Flowchart Dashboard',
    description: 'Import your progress report and keep semester planning in one visual workspace.',
    to: '/dashboard',
    icon: 'pi pi-sitemap',
    image: '/feature-flowchart.svg',
  },
  {
    id: 'smart-scheduler',
    title: 'Smart Scheduler',
    description: 'Generate draft semester schedule options using your planning constraints.',
    to: '/smart-scheduler',
    icon: 'pi pi-calendar-plus',
    image: '/feature-scheduler.svg',
  },
  {
    id: 'majors-browse',
    title: 'Majors Browse',
    description: 'Browse imported majors and inspect requirement structures and option groups.',
    to: '/majors',
    icon: 'pi pi-list',
    image: '/feature-majors.svg',
  },
  {
    id: 'professor-reviews',
    title: 'Professor Reviews',
    description: 'Browse professors and leave customizable student reviews.',
    to: '/professors',
    icon: 'pi pi-star',
    image: '/feature-professors.svg',
  },
  {
    id: 'course-reviews',
    title: 'Course Reviews',
    description: 'Search courses and leave student reviews about workload, difficulty, and outcomes.',
    to: '/course-reviews',
    icon: 'pi pi-comments',
    image: '/feature-course-reviews.svg',
  },
  {
    id: 'games',
    title: 'Games',
    description: 'Play the daily puzzle and compare solve times on peer leaderboards.',
    to: '/games',
    icon: 'pi pi-stopwatch',
    image: '/feature-games.svg',
  },
  {
    id: 'dining',
    title: 'Dining Halls',
    description: 'Compare todays live menus across the main campus dining halls before lunch or dinner.',
    to: '/dining',
    icon: 'pi pi-shopping-bag',
    image: '/feature-dining.svg',
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'View and manage your profile details, major, and account information.',
    to: '/profile',
    icon: 'pi pi-id-card',
    image: '/feature-profile.svg',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Update app preferences and personal configuration options.',
    to: '/settings',
    icon: 'pi pi-cog',
    image: '/feature-settings.svg',
  },
  {
    id: 'friends-list',
    title: 'Friends List',
    description: 'Open your friends list, view profiles, and add new friends.',
    icon: 'pi pi-users',
    action: 'friends',
    image: '/feature-friends.svg',
  },
  {
    id: 'course-catalog',
    title: 'Course Catalog',
    description: 'Search and explore the full course catalog.',
    to: '/catalog',
    icon: 'pi pi-book',
    image: '/feature-catalog.svg',
  },
  {
    id: 'course-badges',
    title: 'Course Badges',
    description: 'Explore and track badge opportunities tied to courses.',
    to: '/badges',
    icon: 'pi pi-star',
    image: '/feature-badges.svg',
  },
  {
    id: 'current-classes',
    title: 'Current Classes',
    description: 'Review and manage your imported current class schedule.',
    to: '/current-classes',
    icon: 'pi pi-calendar',
    image: '/feature-current-classes.svg',
  },
  {
    id: 'canvas',
    title: 'Canvas',
    description: 'Open Canvas in a new tab for assignments and class updates.',
    href: 'https://canvas.iastate.edu/',
    icon: 'pi pi-external-link',
    image: '/feature-canvas.svg',
  },
  {
    id: 'log-out',
    title: 'Log out',
    description: 'Sign out of your account and return to the login page.',
    icon: 'pi pi-sign-out',
    action: 'logout',
    image: '/feature-logout.svg',
  },
];

const validHomeModuleIds = new Set(homeModules.map((module) => module.id));

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
    try {
      const raw = window.localStorage.getItem(HOME_MODULE_VISIBILITY_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const validIds = parsed.filter(
        (item): item is string => typeof item === 'string' && validHomeModuleIds.has(item),
      );
      setHiddenModuleIds(validIds);
    } catch {
      setHiddenModuleIds([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HOME_MODULE_VISIBILITY_KEY, JSON.stringify(hiddenModuleIds));
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

  const todayCode = (() => {
    const day = now.getDay(); // 0=Sun...6=Sat
    if (day === 0) return 'U';
    if (day === 1) return 'M';
    if (day === 2) return 'T';
    if (day === 3) return 'W';
    if (day === 4) return 'R';
    if (day === 5) return 'F';
    return 'S';
  })();

  const parseMinutes = (timeValue: string | null | undefined): number | null => {
    if (!timeValue || typeof timeValue !== 'string') return null;
    const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const formatTime = (totalMinutes: number): string => {
    const h24 = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const formatIsoTime = (timeValue: string | null | undefined): string => {
    const minutes = parseMinutes(timeValue ?? null);
    if (minutes === null) return 'TBD';
    return formatTime(minutes);
  };

  const openTimelineCourse = async (entry: ClassScheduleEntry) => {
    setSelectedTimelineEntry(entry);
    setSelectedTimelineCourse(null);
    if (!entry.courseIdent) return;
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
    .filter((entry) => (entry.meetingDays || '').toUpperCase().includes(todayCode))
    .map((entry) => {
      const start = parseMinutes(entry.meetingStartTime);
      const end = parseMinutes(entry.meetingEndTime);
      return { entry, start, end };
    })
    .filter((x) => x.start !== null && x.end !== null && (x.end as number) > (x.start as number))
    .sort((a, b) => (a.start as number) - (b.start as number));

  const timelineStart = 7 * 60; // 7:00 AM
  const timelineEnd = 22 * 60; // 10:00 PM
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const clampedNow = Math.max(timelineStart, Math.min(timelineEnd, nowMinutes));
  const nowPercent = ((clampedNow - timelineStart) / (timelineEnd - timelineStart)) * 100;

  const timeTicks = [8 * 60, 10 * 60, 12 * 60, 14 * 60, 16 * 60, 18 * 60, 20 * 60];

  const toggleModuleVisibility = (moduleId: string) => {
    setHiddenModuleIds((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId],
    );
  };

  const visibleModules = homeModules.filter((module) => !hiddenModuleIds.includes(module.id));
  const walkthroughModules = homeModules.filter((module) => module.id !== 'log-out');

  const moduleCardBody = (module: HomeModule) => (
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="pt-24 px-3 pb-10 sm:px-5 lg:px-6">
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
                        className="absolute top-2 bottom-2 rounded-md border border-red-300 bg-red-100 px-2 py-1 text-left text-[11px] font-semibold text-gray-700 transition hover:bg-red-200"
                        style={{ left: `${Math.max(0, left)}%`, width: `${Math.max(4, width)}%` }}
                        title={`${entry.courseIdent} • ${entry.courseTitle || entry.catalogName || ''}`}
                      >
                        <div className="truncate">{entry.courseIdent}</div>
                        <div className="truncate text-[10px] font-normal text-gray-600">
                          {formatTime(start as number)} - {formatTime(end as number)}
                        </div>
                      </button>
                    );
                  })}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500" style={{ left: `${nowPercent}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                  {timeTicks.map((tick) => (
                    <span key={tick}>{formatTime(tick)}</span>
                  ))}
                </div>
                {todaysSchedule.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    No timed classes found for today. Import your schedule file on Current Classes if needed.
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Home Modules</p>
                  <p className="text-xs text-gray-500">
                    {visibleModules.length} of {homeModules.length} modules visible
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModuleVisibilityModal(true)}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Customize Modules
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleModules.map((module) => {
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
                    onClick={() => {
                      if (module.action === 'friends') setShowFriendsList(true);
                      if (module.action === 'logout') handleLogout();
                    }}
                    className={`${commonClassName} w-full text-left`}
                  >
                    {moduleCardBody(module)}
                  </button>
                );
              })}

              {visibleModules.length === 0 && (
                <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                  No modules selected. Use Module Visibility above to show cards.
                </div>
              )}
            </div>
          </section>

          <aside className="hidden h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-28 lg:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Quick Actions</p>

            <Link
              to="/profile"
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-id-card mr-2 text-red-500"></i>
              Profile
            </Link>

            <Link
              to="/settings"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-cog mr-2 text-red-500"></i>
              Settings
            </Link>
            <button
              type="button"
              onClick={() => setShowFriendsList(true)}
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-users mr-2 text-red-500"></i>
              Friends List
            </button>
            <Link
              to="/catalog"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-book mr-2 text-red-500"></i>
              Course Catalog
            </Link>
            <Link
              to="/badges"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-star mr-2 text-red-500"></i>
              Course Badges
            </Link>
            <Link
              to="/professors"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-comments mr-2 text-red-500"></i>
              Professor Reviews
            </Link>
            <Link
              to="/course-reviews"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-comment mr-2 text-red-500"></i>
              Course Reviews
            </Link>
            <Link
              to="/games"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-stopwatch mr-2 text-red-500"></i>
              Games
            </Link>
            <Link
              to="/dining"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-shopping-bag mr-2 text-red-500"></i>
              Dining Halls
            </Link>
            <Link
              to="/current-classes"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-calendar mr-2 text-red-500"></i>
              Current Classes
            </Link>
            <a
              href="https://www.fpm.iastate.edu/maps/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-map-marker mr-2 text-red-500"></i>
              Campus Map
            </a>
            <a
              href="https://canvas.iastate.edu/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-external-link mr-2 text-red-500"></i>
              Canvas
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-sign-out mr-2 text-red-500"></i>
              Log out
            </button>
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
        <p className="mt-2 text-sm text-gray-600">Toggle which cards appear in your home modules.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {homeModules.map((module) => (
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
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => {
                    setShowFriendsList(false);
                    setSelectedFriend(friend);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-red-300 hover:bg-red-50"
                >
                  <div className="text-sm font-semibold text-gray-800">{friend.username}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    {`${friend.firstName || ''} ${friend.lastName || ''}`.trim() || 'Name not provided'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Major: {friend.major || 'Not set'}</div>
                </button>
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

            <div className="mt-4 flex items-center gap-4">
              {selectedFriend.profilePictureUrl ? (
                <img
                  src={selectedFriend.profilePictureUrl}
                  alt={`${selectedFriend.username} profile`}
                  className="h-20 w-20 rounded-full border border-gray-200 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-600">
                  {`${selectedFriend.firstName?.[0] ?? ''}${selectedFriend.lastName?.[0] ?? ''}`.trim() || 'FR'}
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-gray-800">{selectedFriend.username}</div>
                <div className="mt-1 text-sm text-gray-600">
                  {`${selectedFriend.firstName || ''} ${selectedFriend.lastName || ''}`.trim() || 'Name not provided'}
                </div>
                <div className="mt-1 text-xs text-gray-500">Major: {selectedFriend.major || 'Not set'}</div>
              </div>
            </div>
          </>
        )}
      </FocusSafeModal>

      <FocusSafeModal
        open={selectedTimelineEntry !== null}
        onClose={() => {
          setSelectedTimelineEntry(null);
          setSelectedTimelineCourse(null);
          setTimelineDetailsLoading(false);
        }}
        title="Course Details"
        maxWidthClass="max-w-2xl"
      >
        {selectedTimelineEntry && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-gray-200 bg-slate-50 p-3">
              <div className="text-base font-semibold text-gray-800">
                {selectedTimelineEntry.sectionCode || selectedTimelineEntry.courseIdent || 'Course'}
              </div>
              <div className="mt-1 text-gray-700">
                {selectedTimelineEntry.courseTitle || selectedTimelineEntry.catalogName || 'Untitled course'}
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
                  <span className="font-semibold">Instructor:</span>{' '}
                  {selectedTimelineEntry.instructor || 'TBD'}
                </div>
                <div>
                  <span className="font-semibold">Mode:</span>{' '}
                  {selectedTimelineEntry.deliveryMode || 'TBD'}
                </div>
                <div>
                  <span className="font-semibold">Location:</span>{' '}
                  {selectedTimelineEntry.locations || 'TBD'}
                </div>
                <div>
                  <span className="font-semibold">Format:</span>{' '}
                  {selectedTimelineEntry.instructionalFormat || 'TBD'}
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
                  Credits: {selectedTimelineCourse.credits} | Offered: {selectedTimelineCourse.offered || 'TBD'} | Hours:{' '}
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
