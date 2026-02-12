// Dashboard.tsx
import { useEffect, useState } from 'react';
import ImportProgressReport from '../components/ImportProgressReport';
import Flowchart from '../components/Flowchart';
import { getUserFlowchart, updateSemesterCourses } from '../api/flowchartApi';
import type { Course as FlowchartCourse, Flowchart as FlowchartType } from '../api/flowchartApi';
import Header from '../components/header';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { createStatusLookup, normalizeCourseIdent, normalizeStatus, resolveCourseStatus } from '../utils/flowchartStatus';

function semesterRank(year: number, term: string): number {
  const order: Record<string, number> = {
    SPRING: 1,
    SUMMER: 2,
    FALL: 3,
  };
  const termRank = order[term?.toUpperCase()] ?? 9;
  return year * 10 + termRank;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [flowchart, setFlowchart] = useState<FlowchartType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  const [courseIdentInput, setCourseIdentInput] = useState('');
  const [updatingSemester, setUpdatingSemester] = useState(false);
  const [addCourseError, setAddCourseError] = useState<string | null>(null);
  const [addCourseSuccess, setAddCourseSuccess] = useState<string | null>(null);
  const [removeCourseError, setRemoveCourseError] = useState<string | null>(null);
  const [removeCourseSuccess, setRemoveCourseSuccess] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<FlowchartCourse | null>(null);

  const sortedSemesters = flowchart?.semesters
    ? [...flowchart.semesters].sort(
        (a, b) => semesterRank(a.year, a.term) - semesterRank(b.year, b.term)
      )
    : [];
  const progressTotal = flowchart?.totalCredits ?? 0;
  const progressCompletedBase = flowchart?.creditsSatisfied ?? 0;
  const statusLookup = createStatusLookup(flowchart?.courseStatusMap);
  const countedInProgress = new Set<string>();
  let inProgressCount = 0;
  let inProgressCredits = 0;
  sortedSemesters.forEach((semester) => {
    semester.courses?.forEach((course) => {
      const identKey = normalizeCourseIdent(course?.courseIdent);
      if (!identKey || countedInProgress.has(identKey)) return;
      const status = resolveCourseStatus(statusLookup, course?.courseIdent);
      if (normalizeStatus(status) !== 'IN_PROGRESS') return;
      countedInProgress.add(identKey);
      inProgressCount += 1;
      inProgressCredits += Number(course?.credits ?? 0);
    });
  });
  const progressCompleted = progressCompletedBase + inProgressCredits;
  const progressPercent = progressTotal > 0 ? Math.round((progressCompleted / progressTotal) * 100) : 0;
  const completedWidthPercent =
    progressTotal > 0 ? Math.min((progressCompletedBase / progressTotal) * 100, 100) : 0;
  const inProgressWidthPercent =
    progressTotal > 0
      ? Math.min((inProgressCredits / progressTotal) * 100, Math.max(0, 100 - completedWidthPercent))
      : 0;

  const reloadFlowchart = async (failMessage: string) => {
    try {
      const fc = await getUserFlowchart();
      setFlowchart(fc);
      return fc;
    } catch (e) {
      console.error('Failed to load flowchart:', e);
      setFlowchart(null);
      setError(failMessage);
      return null;
    }
  };

  // Load saved flowchart when dashboard loads
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      await reloadFlowchart('Failed to load your flowchart. Please refresh and try again.');
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!sortedSemesters.length) {
      setSelectedSemesterId(null);
      return;
    }

    setSelectedSemesterId((current) => {
      const currentExists = current !== null && sortedSemesters.some((sem) => sem.id === current);
      return currentExists ? current : sortedSemesters[0].id;
    });
  }, [flowchart]);

  useEffect(() => {
    if (!flowchart || !selectedCourse) {
      return;
    }
    const existsInFlowchart = (flowchart.semesters ?? []).some((sem) =>
      (sem.courses ?? []).some((course) => course.courseIdent === selectedCourse.courseIdent)
    );
    if (!existsInFlowchart) {
      setSelectedCourse(null);
    }
  }, [flowchart, selectedCourse]);

  // After import completes, reload flowchart from backend
  const handleImportComplete = async () => {
    setLoading(true);
    setError(null);
    await reloadFlowchart('Import succeeded, but loading the flowchart failed. Please refresh.');
    setLoading(false);
  };

  const handleAddCourse = async () => {
    if (!flowchart) return;
    if (selectedSemesterId === null) {
      setAddCourseError('Select a semester before adding a course.');
      setAddCourseSuccess(null);
      return;
    }

    const normalizedIdent = courseIdentInput.trim().toUpperCase().replace(/\s+/g, '_');
    if (!normalizedIdent) {
      setAddCourseError('Enter a course ident like COMS_3090.');
      setAddCourseSuccess(null);
      return;
    }

    setAddCourseError(null);
    setAddCourseSuccess(null);
    setUpdatingSemester(true);

    try {
      await updateSemesterCourses(selectedSemesterId, {
        operation: 'ADD',
        courseIdent: normalizedIdent,
      });
      await reloadFlowchart('Course was added, but reloading the flowchart failed. Please refresh.');
      setCourseIdentInput('');
      setAddCourseSuccess(`Added ${normalizedIdent}.`);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to add course. Confirm the course ident exists.';
      setAddCourseError(message);
      setAddCourseSuccess(null);
    } finally {
      setUpdatingSemester(false);
    }
  };

  const handleRemoveCourse = async () => {
    if (!flowchart) return;
    if (selectedSemesterId === null) {
      setRemoveCourseError('Select a semester before removing a course.');
      setRemoveCourseSuccess(null);
      return;
    }

    const normalizedIdent = courseIdentInput.trim().toUpperCase().replace(/\s+/g, '_');
    if (!normalizedIdent) {
      setRemoveCourseError('Enter a course ident like COMS_3090.');
      setRemoveCourseSuccess(null);
      return;
    }

    setRemoveCourseError(null);
    setRemoveCourseSuccess(null);
    setUpdatingSemester(true);

    try {
      await updateSemesterCourses(selectedSemesterId, {
        operation: 'REMOVE',
        courseIdent: normalizedIdent,
      });
      await reloadFlowchart('Course was removed, but reloading the flowchart failed. Please refresh.');
      setCourseIdentInput('');
      setRemoveCourseSuccess(`Removed ${normalizedIdent}.`);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to remove course. Confirm the course exists in that semester.';
      setRemoveCourseError(message);
      setRemoveCourseSuccess(null);
    } finally {
      setUpdatingSemester(false);
    }
  };

  const handleDeleteFlowchart = async () => {
    if (!flowchart) return;
    try {
      await fetch(`http://localhost:8080/api/flowchart/delete/${flowchart.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setFlowchart(null);
    } catch (err) {
      console.error('Failed to delete flowchart:', err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Logo Section */}
      <Header></Header>
      <div className="flex h-full w-full gap-6 overflow-hidden p-6 pt-24">
        <div className="w-[320px] shrink-0">
          <ImportProgressReport onImported={handleImportComplete} />
          <div className="p-4 w-full">
            <Button
              className="w-full text-center"
              label="Go To Course Catalog"
              icon="pi pi-book"
              outlined
              onClick={() => navigate('/catalog')}
            />
          </div>
          <div className="p-4 w-full space-y-3">
            <div className="text-sm font-semibold text-slate-700">Add Course To Flowchart</div>
            <select
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              value={selectedSemesterId ?? ''}
              onChange={(e) => setSelectedSemesterId(e.target.value ? Number(e.target.value) : null)}
              disabled={!sortedSemesters.length || updatingSemester}
            >
              {sortedSemesters.length === 0 && <option value="">No semesters available</option>}
              {sortedSemesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.year <= 0 ? 'Transfer Credit' : `${sem.term} ${sem.year}`}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              type="text"
              placeholder="Course ident (e.g. COMS_3090)"
              value={courseIdentInput}
              onChange={(e) => setCourseIdentInput(e.target.value)}
              disabled={updatingSemester}
            />
            <Button
              className="w-full text-center"
              label={updatingSemester ? 'Adding...' : 'Add Course'}
              onClick={handleAddCourse}
              disabled={!flowchart || updatingSemester}
            />
            <Button
              className="w-full text-center"
              label={updatingSemester ? 'Removing...' : 'Remove Course'}
              severity="danger"
              outlined
              onClick={handleRemoveCourse}
              disabled={!flowchart || updatingSemester}
            />
            {addCourseError && <div className="text-xs text-red-600">{addCourseError}</div>}
            {addCourseSuccess && <div className="text-xs text-emerald-700">{addCourseSuccess}</div>}
            {removeCourseError && <div className="text-xs text-red-600">{removeCourseError}</div>}
            {removeCourseSuccess && <div className="text-xs text-emerald-700">{removeCourseSuccess}</div>}
          </div>
          <div className="p-4 w-full">
            <Button
              className="w-full text-center"
              label="Delete Flowchart"
              onClick={handleDeleteFlowchart}
            ></Button>
          </div>
          {loading && (
            <div className="flex justify-center py-10">
              <ProgressSpinner style={{ width: '50px', height: '50px' }} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {error && <div className="text-center text-red-600 pt-4">{error}</div>}
          {flowchart ? (
            <div className="flex h-full flex-col items-center">
              <div className="flex h-full w-full max-w-[1320px] flex-col gap-4 xl:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                      <span>Degree Progress</span>
                      <span>
                        {progressCompleted} / {progressTotal} credits ({progressPercent}%)
                      </span>
                    </div>
                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="flex h-full w-full">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${completedWidthPercent}%` }}
                        />
                        <div
                          className="h-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${inProgressWidthPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span>{inProgressCount} course(s) currently in progress</span>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-emerald-300 bg-emerald-500" />
                        Completed
                        <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-amber-300 bg-amber-500 ml-2" />
                        In progress
                      </span>
                    </div>
                  </div>
                  <Flowchart flowchart={flowchart} onCourseSelect={setSelectedCourse} />
                </div>
                {selectedCourse && (
                  <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:w-[340px]">
                    <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      Selected Course
                    </div>
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          {selectedCourse.courseIdent.replace('_', ' ')}
                        </div>
                        <div className="text-red-600">{selectedCourse.name}</div>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                        Credits: {selectedCourse.credits}
                        {selectedCourse.hours ? ` | ${selectedCourse.hours}` : ''}
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Offered
                        </div>
                        <div>{selectedCourse.offered || 'Not listed'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Description
                        </div>
                        <div className="leading-relaxed">{selectedCourse.description || 'No description.'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Prerequisites
                        </div>
                        <div>
                          {selectedCourse.prerequisites?.length
                            ? selectedCourse.prerequisites.join(', ')
                            : selectedCourse.prereq_txt || 'None'}
                        </div>
                      </div>
                    </div>
                  </aside>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-600 pt-10">
              Upload a progress report to generate your flowchart.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
