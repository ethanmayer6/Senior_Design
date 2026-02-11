import { Link } from 'react-router-dom';
import Header from '../components/header';

const featureLinks = [
  {
    title: 'Flowchart Dashboard',
    description: 'Import your progress report and manage your flowchart plan.',
    to: '/dashboard',
  },
  {
    title: 'Course Catalog',
    description: 'Browse available courses and requirements.',
    to: '/catalog',
  },
  {
    title: 'Course Badges',
    description: 'Track achievements and explore badge progress.',
    to: '/badges',
  },
  {
    title: 'Profile',
    description: 'Update your account details and preferences.',
    to: '/profile',
  },
];

export default function CourseflowHome() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-28 px-6 pb-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800">CourseFlow Home</h1>
          <p className="text-gray-600 mt-2 mb-8">
            Choose where you want to go next in CourseFlow.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {featureLinks.map((feature) => (
              <Link
                key={feature.to}
                to={feature.to}
                className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-red-300 transition"
              >
                <h2 className="text-xl font-semibold text-gray-800">{feature.title}</h2>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
