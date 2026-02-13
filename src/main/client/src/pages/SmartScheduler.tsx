import { useMemo, useState } from 'react';
import Header from '../components/header';

type DraftOption = {
  id: string;
  title: string;
  summary: string;
  projectedCredits: number;
  courses: string[];
  notes: string;
};

const starterSchedules: DraftOption[] = [
  {
    id: 'balanced',
    title: 'Balanced Path',
    summary: 'Spreads core and elective work evenly to reduce overload risk.',
    projectedCredits: 14,
    courses: ['COM S 3110', 'SE 3190', 'CPRE 3100', 'ENGL 3140'],
    notes: 'Good default option when you want steady progress each term.',
  },
  {
    id: 'acceleration',
    title: 'Acceleration Path',
    summary: 'Higher load to advance toward capstone requirements faster.',
    projectedCredits: 16,
    courses: ['COM S 3210', 'SE 3290', 'COM S 3630', 'MATH 2670', 'SP CM 2120'],
    notes: 'Best for students comfortable with a heavier technical semester.',
  },
  {
    id: 'light',
    title: 'Light Load Path',
    summary: 'Lighter semester with priority on sequencing-critical courses.',
    projectedCredits: 12,
    courses: ['COM S 3090', 'SE 3170', 'LIB 1600'],
    notes: 'Useful during internship/job-search semesters.',
  },
];

export default function SmartScheduler() {
  const [targetTerm, setTargetTerm] = useState('FALL 2026');
  const [maxCredits, setMaxCredits] = useState(15);
  const [preferredMode, setPreferredMode] = useState('Any');
  const [generated, setGenerated] = useState(false);

  const filteredSchedules = useMemo(() => {
    if (!generated) return [];
    return starterSchedules.filter((option) => option.projectedCredits <= maxCredits + 1);
  }, [generated, maxCredits]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Planning Tool</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Smart Scheduler</h1>
          <p className="mt-3 max-w-3xl text-sm text-gray-600">
            Template mode is active. Configure planning preferences and generate draft schedule options.
            Data-driven schedule optimization will be added in the next implementation phase.
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
              <option>SPRING 2026</option>
              <option>SUMMER 2026</option>
              <option>FALL 2026</option>
              <option>SPRING 2027</option>
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
              onChange={(e) => setPreferredMode(e.target.value)}
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
            Generate Drafts
          </button>
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
              Smart Scheduler template is ready. Click <span className="font-semibold">Generate Drafts</span> to see
              sample schedules.
            </div>
          )}

          {generated && filteredSchedules.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
              No template schedules fit the selected constraints. Increase max credits and generate again.
            </div>
          )}

          {generated && filteredSchedules.length > 0 && (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {filteredSchedules.map((option) => (
                <article key={option.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-800">{option.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{option.summary}</p>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {option.projectedCredits} Credits
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {option.courses.map((course) => (
                      <li key={course} className="rounded-md bg-gray-50 px-2 py-1">
                        {course}
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
