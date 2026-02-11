import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/header';
import { logout } from '../utils/auth';

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
];

export default function CourseflowHome() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="pt-24 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl gap-6">
          <aside className="hidden md:block w-64 shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm h-fit sticky top-28">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Quick Actions</p>

            <Link
              to="/profile"
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
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

          <section className="flex-1">
            <div className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Welcome</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">CourseFlow Home</h1>
              <p className="mt-3 max-w-2xl text-gray-600">
                Jump into your planning tools, keep your class roadmap updated, and stay focused on graduation goals.
              </p>

              <div className="mt-6 flex gap-3 md:hidden">
                <Link
                  to="/profile"
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
        </div>
      </main>
    </div>
  );
}
