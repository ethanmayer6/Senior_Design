import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/header';
import { logout } from '../utils/auth';
import { getFriends, type StudentSearchResult } from '../api/usersApi';

const featureLinks = [
  {
    title: 'Flowchart Dashboard',
    description: 'Import your progress report and keep semester planning in one visual workspace.',
    to: '/dashboard',
    icon: 'pi pi-sitemap',
  },
  {
    title: 'Course Catalog',
    description: 'Search courses, review details, and find classes that satisfy your requirements.',
    to: '/catalog',
    icon: 'pi pi-book',
  },
  {
    title: 'Course Badges',
    description: 'Track milestones and celebrate your degree progress with achievement badges.',
    to: '/badges',
    icon: 'pi pi-star',
  },
  {
    title: 'Student Search',
    description: 'Search for existing student accounts by username so you can quickly find peers.',
    to: '/student-search',
    icon: 'pi pi-users',
  },
  {
    title: 'Smart Scheduler',
    description: 'Generate draft semester schedule options using your planning constraints.',
    to: '/smart-scheduler',
    icon: 'pi pi-calendar-plus',
  },
  {
    title: 'Current Classes',
    description: 'See courses from your current term automatically based on today’s date.',
    to: '/current-classes',
    icon: 'pi pi-calendar',
  },
];

export default function CourseflowHome() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<StudentSearchResult[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="pt-24 px-3 pb-10 sm:px-5 lg:px-6">
        <div className="mx-auto grid w-full max-w-[1820px] items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)_18rem]">
          <aside className="hidden h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-28 lg:block">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Friends List</p>
                <h2 className="mt-1 text-base font-semibold text-gray-800">Your Friends</h2>
              </div>
              <Link
                to="/student-search"
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
                <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                  {friends.map((friend) => (
                    <div key={friend.id} className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="text-sm font-semibold text-gray-800">{friend.username}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {`${friend.firstName || ''} ${friend.lastName || ''}`.trim() || 'Name not provided'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Major: {friend.major || 'Not set'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="mx-auto w-full max-w-none">
            <div className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Welcome</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">CourseFlow Home</h1>
              <p className="mt-3 max-w-2xl text-gray-600">
                Jump into your planning tools, keep your class roadmap updated, and stay focused on graduation goals.
              </p>

              <div className="mt-6 flex gap-3 md:hidden">
                <Link
                  to="/settings"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
                >
                  <i className="pi pi-cog mr-2 text-red-500"></i>
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
                >
                  <i className="pi pi-sign-out mr-2 text-red-500"></i>
                  Log out
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featureLinks.map((feature) => (
                <Link
                  key={feature.to}
                  to={feature.to}
                  className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 transition group-hover:bg-red-100">
                    <i className={`${feature.icon} text-xl`}></i>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-gray-800">{feature.title}</h2>
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
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-sign-out mr-2 text-red-500"></i>
              Log out
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
