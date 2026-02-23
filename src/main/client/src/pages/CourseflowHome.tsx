import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/header';
import { logout } from '../utils/auth';
import { getFriends, type StudentSearchResult } from '../api/usersApi';
import FocusSafeModal from '../components/FocusSafeModal';
import { getCurrentClassSchedule, getCourseByIdent, type ClassScheduleEntry } from '../api/classScheduleApi';
import type { Course } from '../api/flowchartApi';

const featureLinks = [
  {
    title: 'Flowchart Dashboard',
    description: 'Import your progress report and keep semester planning in one visual workspace.',
    to: '/dashboard',
    icon: 'pi pi-sitemap',
    image: '/feature-flowchart.svg',
  },
  {
    title: 'Smart Scheduler',
    description: 'Generate draft semester schedule options using your planning constraints.',
    to: '/smart-scheduler',
    icon: 'pi pi-calendar-plus',
    image: '/feature-scheduler.svg',
  },
  {
    title: 'Majors Browse',
    description: 'Browse imported majors and inspect requirement structures and option groups.',
    to: '/majors',
    icon: 'pi pi-list',
    image: '/feature-majors.svg',
  },
];

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

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featureLinks.map((feature) => (
                <Link
                  key={feature.to}
                  to={feature.to}
                  className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-md"
                >
                  <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-slate-50">
                    <img
                      src={feature.image}
                      alt={`${feature.title} illustration`}
                      className="h-36 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">{feature.title}</h2>
                  <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
                </Link>
              ))}
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
              to="/student-search"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-users mr-2 text-red-500"></i>
              Student Search
            </Link>
            <Link
              to="/badges"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-star mr-2 text-red-500"></i>
              Course Badges
            </Link>
            <Link
              to="/current-classes"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-calendar mr-2 text-red-500"></i>
              Current Classes
            </Link>
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

