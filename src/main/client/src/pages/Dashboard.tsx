// Dashboard.tsx
import { useEffect, useState } from 'react';
import ImportProgressReport from '../components/ImportProgressReport';
import Flowchart from '../components/Flowchart';
import { getUserFlowchart, updateSemesterCourses } from '../api/flowchartApi';
import type { Flowchart as FlowchartType } from '../api/flowchartApi';
import Header from '../components/header';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';

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
  const [flowchart, setFlowchart] = useState<FlowchartType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  const [courseIdentInput, setCourseIdentInput] = useState('');
  const [updatingSemester, setUpdatingSemester] = useState(false);
  const [addCourseError, setAddCourseError] = useState<string | null>(null);
  const [addCourseSuccess, setAddCourseSuccess] = useState<string | null>(null);

  const sortedSemesters = flowchart?.semesters
    ? [...flowchart.semesters].sort(
        (a, b) => semesterRank(a.year, a.term) - semesterRank(b.year, b.term)
      )
    : [];
  const progressTotal = flowchart?.totalCredits ?? 0;
  const progressCompletedRaw = flowchart?.creditsSatisfied ?? 0;
  const progressCompleted =
    progressTotal > 0 ? Math.min(progressCompletedRaw, progressTotal) : progressCompletedRaw;
  const progressPercent =
    progressTotal > 0 ? Math.round((progressCompleted / progressTotal) * 100) : 0;

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
            {addCourseError && <div className="text-xs text-red-600">{addCourseError}</div>}
            {addCourseSuccess && <div className="text-xs text-emerald-700">{addCourseSuccess}</div>}
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
              <div className="mb-4 w-full max-w-[980px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Degree Progress</span>
                  <span>
                    {progressCompleted} / {progressTotal} credits ({progressPercent}%)
                  </span>
                </div>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <Flowchart flowchart={flowchart} />
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
