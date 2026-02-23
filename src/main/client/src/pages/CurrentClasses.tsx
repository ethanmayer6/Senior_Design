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

function getCurrentTerm(date: Date): 'SPRING' | 'SUMMER' | 'FALL' {
  const month = date.getMonth() + 1;
  if (month <= 5) return 'SPRING';
  if (month <= 8) return 'SUMMER';
  return 'FALL';
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

  const formattedDate = useMemo(
    () =>
      today.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [today]
  );

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
