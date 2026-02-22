import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/header';
import { logout } from '../utils/auth';
import { getFriends, type StudentSearchResult } from '../api/usersApi';
import {
  getIsuImportJob,
  retryIsuImportJob,
  startIsuImportJobFromPublicFile,
  type IsuImportJob,
} from '../api/majorsApi';
import { publishAppNotification } from '../utils/notifications';
import FocusSafeModal from '../components/FocusSafeModal';

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
    title: 'Majors Browse',
    description: 'Browse imported majors and inspect requirement structures and option groups.',
    to: '/majors',
    icon: 'pi pi-list',
  },
];

export default function CourseflowHome() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<StudentSearchResult[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<StudentSearchResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [majorImportJob, setMajorImportJob] = useState<IsuImportJob | null>(null);
  const [courseImportLoading, setCourseImportLoading] = useState(false);
  const [courseImportMessage, setCourseImportMessage] = useState<string | null>(null);
  const [courseImportError, setCourseImportError] = useState<string | null>(null);
  const [courseImportJob, setCourseImportJob] = useState<IsuImportJob | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => setSelectedFriend(friend)}
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
          </aside>

          <section className="mx-auto w-full max-w-none">
            <div className="rounded-2xl border border-red-100 bg-white/90 p-4 shadow-sm sm:p-5">
              <div className="flex justify-center">
                <img
                  src="/logo.png"
                  alt="CourseFlow"
                  className="w-full max-w-[400px] sm:max-w-[500px]"
                />
              </div>

              <div className="mt-6 flex gap-3 md:hidden">
                <button
                  type="button"
                  onClick={handleImportIsuData}
                  disabled={importLoading}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i className="pi pi-upload mr-2 text-red-500"></i>
                  {importLoading ? 'Importing...' : 'Import ISU Degree Data'}
                </button>
                <button
                  type="button"
                  onClick={handleImportCourseData}
                  disabled={courseImportLoading}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i className="pi pi-database mr-2 text-red-500"></i>
                  {courseImportLoading ? 'Importing...' : 'Import Course Data'}
                </button>
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

              {importMessage && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {importMessage}
                </div>
              )}
            {importError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {importError}
              </div>
            )}
            {majorImportJob && importLoading && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Import progress: {majorImportJob.progressPercent}% ({majorImportJob.processedChunks}/{majorImportJob.totalChunks} chunks)
              </div>
            )}
            {majorImportJob && !importLoading && Object.keys(majorImportJob.failedChunks ?? {}).length > 0 && (
              <button
                type="button"
                onClick={handleRetryMajorImport}
                className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                Retry Failed Major Import Chunks
              </button>
            )}
            {courseImportMessage && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {courseImportMessage}
              </div>
            )}
            {courseImportError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {courseImportError}
              </div>
            )}
            {courseImportJob && courseImportLoading && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Course import progress: {courseImportJob.progressPercent}% ({courseImportJob.processedChunks}/{courseImportJob.totalChunks} chunks)
              </div>
            )}
            {courseImportJob && !courseImportLoading && Object.keys(courseImportJob.failedChunks ?? {}).length > 0 && (
              <button
                type="button"
                onClick={handleRetryCourseImport}
                className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                Retry Failed Course Import Chunks
              </button>
            )}
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
            <Link
              to="/current-classes"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-calendar mr-2 text-red-500"></i>
              Current Classes
            </Link>

            <button
              type="button"
              onClick={handleImportIsuData}
              disabled={importLoading}
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="pi pi-upload mr-2 text-red-500"></i>
              {importLoading ? 'Importing...' : 'Import ISU Degree Data'}
            </button>
            <button
              type="button"
              onClick={handleImportCourseData}
              disabled={courseImportLoading}
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="pi pi-database mr-2 text-red-500"></i>
              {courseImportLoading ? 'Importing...' : 'Import Course Data'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-sign-out mr-2 text-red-500"></i>
              Log out
            </button>

            {importMessage && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {importMessage}
              </div>
            )}
            {importError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {importError}
              </div>
            )}
            {majorImportJob && importLoading && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Import progress: {majorImportJob.progressPercent}% ({majorImportJob.processedChunks}/{majorImportJob.totalChunks})
              </div>
            )}
            {majorImportJob && !importLoading && Object.keys(majorImportJob.failedChunks ?? {}).length > 0 && (
              <button
                type="button"
                onClick={handleRetryMajorImport}
                className="mt-2 w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                Retry Failed Major Chunks
              </button>
            )}
            {courseImportMessage && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {courseImportMessage}
              </div>
            )}
            {courseImportError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {courseImportError}
              </div>
            )}
            {courseImportJob && courseImportLoading && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Course progress: {courseImportJob.progressPercent}% ({courseImportJob.processedChunks}/{courseImportJob.totalChunks})
              </div>
            )}
            {courseImportJob && !courseImportLoading && Object.keys(courseImportJob.failedChunks ?? {}).length > 0 && (
              <button
                type="button"
                onClick={handleRetryCourseImport}
                className="mt-2 w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                Retry Failed Course Chunks
              </button>
            )}
          </aside>
        </div>
      </main>

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
    </div>
  );
}

