import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import {
  getDiningOverview,
  type DiningHall,
  type DiningMenuSection,
  type DiningOverview,
} from '../api/diningApi';

function formatClockTime(value: string): string {
  if (!value) return 'TBD';
  const [hoursText = '0', minutesText = '00'] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function formatServiceDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatRefreshedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function pickDefaultSection(hall: DiningHall): string {
  const currentWindow = hall.todaysHours.find((window) => window.current);
  if (currentWindow) {
    const matchingSection = hall.menus.find((menu) => menu.section === currentWindow.name);
    if (matchingSection) {
      return matchingSection.section;
    }
  }

  return hall.menus[0]?.section ?? '';
}

function HallMenu({ hall, section }: { hall: DiningHall; section: DiningMenuSection | undefined }) {
  if (hall.warningMessage) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {hall.warningMessage}
      </div>
    );
  }

  if (!section) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 px-4 py-6 text-sm text-stone-600">
        No menu was posted for this hall on the selected service day.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {section.stations.map((station) => (
        <article
          key={`${hall.slug}-${section.section}-${station.name}`}
          className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-stone-900">{station.name}</h3>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              {section.section}
            </span>
          </div>

          <div className="grid gap-4">
            {station.categories.map((category) => (
              <section key={`${station.name}-${category.name}`}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                  {category.name}
                </h4>
                <div className="grid gap-2">
                  {category.items.map((item) => (
                    <div
                      key={`${station.name}-${category.name}-${item.name}`}
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2"
                    >
                      <div className="text-sm font-medium text-stone-800">{item.name}</div>
                      {item.dietaryTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.dietaryTags.map((tag) => (
                            <span
                              key={`${item.name}-${tag}`}
                              className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function Dining() {
  const [overview, setOverview] = useState<DiningOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function loadDining() {
      setLoading(true);
      setError(null);
      try {
        const nextOverview = await getDiningOverview();
        if (!active) return;
        setOverview(nextOverview);
      } catch (err) {
        console.error('Failed to load dining overview', err);
        if (!active) return;
        setOverview(null);
        setError('The live Iowa State dining feed could not be loaded right now.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDining();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!overview) return;

    setSelectedSections((current) => {
      const next = { ...current };
      for (const hall of overview.halls) {
        const currentSelection = next[hall.slug];
        const hasCurrentSelection = hall.menus.some((menu) => menu.section === currentSelection);
        if (!hasCurrentSelection) {
          next[hall.slug] = pickDefaultSection(hall);
        }
      }
      return next;
    });
  }, [overview]);

  useEffect(() => {
    const now = new Date();
    const nextRefresh = new Date(now);
    nextRefresh.setHours(24, 5, 0, 0);
    const refreshDelay = Math.max(60_000, nextRefresh.getTime() - now.getTime());

    const timeoutId = window.setTimeout(async () => {
      try {
        const nextOverview = await getDiningOverview();
        setOverview(nextOverview);
        setError(null);
      } catch (err) {
        console.error('Failed to refresh dining overview', err);
      }
    }, refreshDelay);

    return () => window.clearTimeout(timeoutId);
  }, [overview?.serviceDate]);

  const hallCount = overview?.halls.length ?? 0;
  const openHallCount = overview?.halls.filter((hall) => hall.openNow).length ?? 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.12),_transparent_32%),linear-gradient(180deg,_#fffaf3_0%,_#f5efe4_40%,_#efe7da_100%)]">
      <Header />

      <main className="px-3 pb-12 pt-24 sm:px-5 lg:px-6">
        <div className="mx-auto max-w-[1600px]">
          <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_24px_80px_rgba(120,53,15,0.08)] backdrop-blur sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Dining Module</p>
                <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                  Compare today's dining halls before you pick where to eat.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
                  This page pulls the official Iowa State Dining feed for the main residence dining halls and refreshes on the next day boundary.
                </p>
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Service Day</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">
                    {overview ? formatServiceDate(overview.serviceDate) : 'Loading...'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Halls</p>
                    <p className="mt-1 text-2xl font-semibold text-stone-900">{hallCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Open Now</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-700">{openHallCount}</p>
                  </div>
                </div>
                <div className="text-xs text-stone-500">
                  Official source:{' '}
                  <a
                    href={overview?.sourceUrl ?? 'https://www.dining.iastate.edu/hours-menus/'}
                    className="font-semibold text-amber-800 underline decoration-amber-300 underline-offset-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {overview?.sourceName ?? 'Iowa State Dining'}
                  </a>
                  {overview?.refreshedAt && <span className="block mt-1">Updated {formatRefreshedAt(overview.refreshedAt)}</span>}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/courseflow"
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-500 hover:text-amber-800"
              >
                Back to Modules
              </Link>
              {overview && (
                <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
                  Main halls shown: {overview.halls.map((hall) => hall.title).join(', ')}
                </span>
              )}
            </div>
          </section>

          {loading && (
            <section className="mt-6 rounded-[2rem] border border-stone-200 bg-white/80 p-6 text-sm text-stone-600 shadow-sm">
              Loading today's dining halls and menus...
            </section>
          )}

          {error && !loading && (
            <section className="mt-6 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
              {error}
            </section>
          )}

          {overview && !loading && (
            <section className="mt-6 grid gap-5 xl:grid-cols-2">
              {overview.halls.map((hall) => {
                const selectedSectionName = selectedSections[hall.slug];
                const selectedSection = hall.menus.find((menu) => menu.section === selectedSectionName);

                return (
                  <article
                    key={hall.slug}
                    className="rounded-[2rem] border border-stone-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(120,53,15,0.07)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-semibold text-stone-900">{hall.title}</h2>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              hall.openNow
                                ? 'bg-emerald-100 text-emerald-800'
                                : hall.todaysHours.length > 0
                                  ? 'bg-stone-200 text-stone-700'
                                  : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {hall.openNow ? 'Open now' : hall.todaysHours.length > 0 ? 'Closed right now' : 'No service today'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-stone-600">{hall.facility || hall.address}</p>
                        {hall.facility && hall.address && <p className="text-sm text-stone-500">{hall.address}</p>}
                      </div>

                      <a
                        href={hall.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-500 hover:text-amber-800"
                      >
                        Official page
                      </a>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Today's service windows</p>
                      {hall.todaysHours.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {hall.todaysHours.map((window) => (
                            <div
                              key={`${hall.slug}-${window.name}-${window.startTime}`}
                              className={`min-w-[10rem] rounded-2xl border px-3 py-3 ${
                                window.current
                                  ? 'border-emerald-200 bg-emerald-50'
                                  : 'border-stone-200 bg-stone-50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-stone-800">{window.name}</span>
                                {window.current && (
                                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                    Now
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-stone-600">
                                {formatClockTime(window.startTime)} - {formatClockTime(window.endTime)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-stone-600">No meal service is listed for this hall today.</p>
                      )}
                    </div>

                    {hall.menus.length > 0 && (
                      <div className="mt-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Today's menus</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {hall.menus.map((menu) => (
                            <button
                              key={`${hall.slug}-${menu.section}`}
                              type="button"
                              onClick={() =>
                                setSelectedSections((current) => ({
                                  ...current,
                                  [hall.slug]: menu.section,
                                }))
                              }
                              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                selectedSectionName === menu.section
                                  ? 'bg-stone-900 text-white'
                                  : 'border border-stone-300 bg-white text-stone-700 hover:border-amber-500 hover:text-amber-800'
                              }`}
                            >
                              {menu.section}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6">
                      <HallMenu hall={hall} section={selectedSection} />
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
