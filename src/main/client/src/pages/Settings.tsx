import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import {
  getUserPreferences,
  updateUserPreferences,
  type UserPreferences,
} from '../api/usersApi';
import { getSavedThemePreferences, setThemePreferences } from '../utils/theme';
import {
  getIsuImportJob,
  retryIsuImportJob,
  startIsuImportJobFromPublicFile,
  type IsuImportJob,
} from '../api/majorsApi';
import { publishAppNotification } from '../utils/notifications';

const themeOptions = [
  { label: 'Default', value: 'default' },
  { label: 'Ocean', value: 'ocean' },
  { label: 'Forest', value: 'forest' },
];

const fontScaleOptions = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

export default function Settings() {
  const [prefs, setPrefs] = useState<UserPreferences>(getSavedThemePreferences());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [majorImportJob, setMajorImportJob] = useState<IsuImportJob | null>(null);
  const [courseImportLoading, setCourseImportLoading] = useState(false);
  const [courseImportMessage, setCourseImportMessage] = useState<string | null>(null);
  const [courseImportError, setCourseImportError] = useState<string | null>(null);
  const [courseImportJob, setCourseImportJob] = useState<IsuImportJob | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true);
      setError(null);
      try {
        const serverPrefs = await getUserPreferences();
        setPrefs(serverPrefs);
        setThemePreferences(serverPrefs);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load settings. Using local settings.');
        const local = getSavedThemePreferences();
        setPrefs(local);
        setThemePreferences(local);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const updateLocal = (next: UserPreferences) => {
    setPrefs(next);
    setThemePreferences(next);
    setSuccess(null);
    setError(null);
  };

  const savePreferences = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const persisted = await updateUserPreferences(prefs);
      setPrefs(persisted);
      setThemePreferences(persisted);
      setSuccess('Settings saved.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const pollImportJob = async (jobId: string, setter: (job: IsuImportJob) => void): Promise<IsuImportJob> => {
    let latest = await getIsuImportJob(jobId);
    setter(latest);
    while (latest.status === 'RUNNING') {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      latest = await getIsuImportJob(jobId);
      setter(latest);
    }
    return latest;
  };

  const handleImportIsuData = async () => {
    setImportLoading(true);
    setImportMessage(null);
    setImportError(null);
    setMajorImportJob(null);
    try {
      const started = await startIsuImportJobFromPublicFile('MAJORS_ONLY', '/isu-degree-dataset.json', 80);
      setMajorImportJob(started);
      const finished = await pollImportJob(started.jobId, setMajorImportJob);
      const result = finished.result;
      setImportMessage(
        `ISU data imported: ${result?.majorsCreated ?? 0} majors created, ${result?.majorsUpdated ?? 0} updated, ${result?.requirementsCreated ?? 0} requirements loaded.`
      );
      if (finished.status === 'COMPLETED_WITH_ERRORS' || finished.status === 'FAILED') {
        setImportError(finished.message || 'Import completed with errors.');
        publishAppNotification({
          level: 'warning',
          title: 'Major Import Partial Failure',
          message: `${Object.keys(finished.failedChunks ?? {}).length} chunk(s) failed. Use retry to resume.`,
        });
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      const message = apiMessage || err?.message || 'Failed to import ISU degree dataset.';
      setImportError(message);
      publishAppNotification({
        level: 'error',
        title: 'Degree Import Failed',
        message: `${message} Verify dataset file and retry import.`,
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportCourseData = async () => {
    setCourseImportLoading(true);
    setCourseImportMessage(null);
    setCourseImportError(null);
    setCourseImportJob(null);
    try {
      const started = await startIsuImportJobFromPublicFile('COURSES_ONLY', '/isu-degree-dataset.json', 200);
      setCourseImportJob(started);
      const finished = await pollImportJob(started.jobId, setCourseImportJob);
      const result = finished.result;
      setCourseImportMessage(
        `Course data imported: ${result?.coursesCreated ?? 0} courses created, ${result?.coursesUpdated ?? 0} updated.`
      );
      if (finished.status === 'COMPLETED_WITH_ERRORS' || finished.status === 'FAILED') {
        setCourseImportError(finished.message || 'Course import completed with errors.');
        publishAppNotification({
          level: 'warning',
          title: 'Course Import Partial Failure',
          message: `${Object.keys(finished.failedChunks ?? {}).length} chunk(s) failed. Use retry to resume.`,
        });
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      const message = apiMessage || err?.message || 'Failed to import course data.';
      setCourseImportError(message);
      publishAppNotification({
        level: 'error',
        title: 'Course Import Failed',
        message: `${message} Regenerate course data and try again.`,
      });
    } finally {
      setCourseImportLoading(false);
    }
  };

  const handleRetryMajorImport = async () => {
    if (!majorImportJob?.jobId) return;
    setImportLoading(true);
    setImportError(null);
    try {
      await retryIsuImportJob(majorImportJob.jobId);
      const finished = await pollImportJob(majorImportJob.jobId, setMajorImportJob);
      if (finished.status === 'COMPLETED') {
        setImportMessage('Major import retry completed successfully.');
        setImportError(null);
      } else {
        setImportError(finished.message || 'Retry still has failed chunks.');
      }
    } finally {
      setImportLoading(false);
    }
  };

  const handleRetryCourseImport = async () => {
    if (!courseImportJob?.jobId) return;
    setCourseImportLoading(true);
    setCourseImportError(null);
    try {
      await retryIsuImportJob(courseImportJob.jobId);
      const finished = await pollImportJob(courseImportJob.jobId, setCourseImportJob);
      if (finished.status === 'COMPLETED') {
        setCourseImportMessage('Course import retry completed successfully.');
        setCourseImportError(null);
      } else {
        setCourseImportError(finished.message || 'Retry still has failed chunks.');
      }
    } finally {
      setCourseImportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Settings</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Preferences</h1>
          </div>
          <Link to="/courseflow">
            <Button label="Back" icon="pi pi-arrow-left" outlined />
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {loading ? (
            <div className="text-sm text-slate-600">Loading settings...</div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-800">Dark Mode</div>
                  <div className="text-sm text-slate-600">Use a darker color theme across CourseFlow.</div>
                </div>
                <InputSwitch
                  checked={prefs.darkMode}
                  onChange={(e) => updateLocal({ ...prefs, darkMode: !!e.value })}
                />
              </div>

              <div>
                <div className="mb-1 text-base font-semibold text-slate-800">Theme Preset</div>
                <div className="mb-2 text-sm text-slate-600">Choose an accent style for the app UI.</div>
                <Dropdown
                  className="w-full sm:w-72"
                  value={prefs.themePreset}
                  options={themeOptions}
                  onChange={(e) => updateLocal({ ...prefs, themePreset: e.value })}
                />
              </div>

              <div>
                <div className="mb-1 text-base font-semibold text-slate-800">Font Size</div>
                <div className="mb-2 text-sm text-slate-600">Adjust global text size for readability.</div>
                <Dropdown
                  className="w-full sm:w-72"
                  value={prefs.fontScale}
                  options={fontScaleOptions}
                  onChange={(e) => updateLocal({ ...prefs, fontScale: e.value })}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-800">Reduced Motion</div>
                  <div className="text-sm text-slate-600">
                    Minimize animations and transitions across the app.
                  </div>
                </div>
                <InputSwitch
                  checked={prefs.reducedMotion}
                  onChange={(e) => updateLocal({ ...prefs, reducedMotion: !!e.value })}
                />
              </div>

              <div className="pt-2">
                <Button
                  label={saving ? 'Saving...' : 'Save Settings'}
                  icon="pi pi-save"
                  onClick={savePreferences}
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Data Import</h2>
          <p className="mt-1 text-sm text-slate-600">
            Run major and course import jobs from the ISU dataset.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              label={importLoading ? 'Importing Majors...' : 'Import ISU Degree Data'}
              icon="pi pi-upload"
              onClick={handleImportIsuData}
              disabled={importLoading}
            />
            <Button
              label={courseImportLoading ? 'Importing Courses...' : 'Import Course Data'}
              icon="pi pi-database"
              onClick={handleImportCourseData}
              disabled={courseImportLoading}
              outlined
            />
          </div>

          {importMessage && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {importMessage}
            </div>
          )}
          {importError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {importError}
            </div>
          )}
          {majorImportJob && importLoading && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Import progress: {majorImportJob.progressPercent}% ({majorImportJob.processedChunks}/{majorImportJob.totalChunks} chunks)
            </div>
          )}
          {majorImportJob && !importLoading && Object.keys(majorImportJob.failedChunks ?? {}).length > 0 && (
            <Button
              className="mt-2"
              label="Retry Failed Major Chunks"
              severity="warning"
              outlined
              onClick={handleRetryMajorImport}
            />
          )}

          {courseImportMessage && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {courseImportMessage}
            </div>
          )}
          {courseImportError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {courseImportError}
            </div>
          )}
          {courseImportJob && courseImportLoading && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Course progress: {courseImportJob.progressPercent}% ({courseImportJob.processedChunks}/{courseImportJob.totalChunks} chunks)
            </div>
          )}
          {courseImportJob && !courseImportLoading && Object.keys(courseImportJob.failedChunks ?? {}).length > 0 && (
            <Button
              className="mt-2"
              label="Retry Failed Course Chunks"
              severity="warning"
              outlined
              onClick={handleRetryCourseImport}
            />
          )}
        </section>
      </main>
    </div>
  );
}
