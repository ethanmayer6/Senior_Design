import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import {
  createCourseReview,
  deleteMyCourseReview,
  getCourseReviewSummary,
  getCourseReviews,
  searchCoursesForReviews,
  updateMyCourseReview,
  type CourseReview,
  type CourseReviewPageResponse,
  type CourseReviewSummary,
  type CourseSummary,
} from '../api/courseReviewsApi';

type ReviewFormState = {
  rating: number;
  difficultyRating: number | null;
  workloadRating: number | null;
  wouldTakeAgain: string;
  semesterTaken: string;
  instructorName: string;
  gradeReceived: string;
  positives: string;
  negatives: string;
  wouldLikeToSee: string;
  studyTips: string;
  anonymous: boolean;
};

const DEFAULT_FORM: ReviewFormState = {
  rating: 5,
  difficultyRating: null,
  workloadRating: null,
  wouldTakeAgain: '',
  semesterTaken: '',
  instructorName: '',
  gradeReceived: '',
  positives: '',
  negatives: '',
  wouldLikeToSee: '',
  studyTips: '',
  anonymous: false,
};

function normalizeRole(role: string | null | undefined): string {
  if (!role) return '';
  const normalized = role.trim().toUpperCase();
  return normalized.startsWith('ROLE_') ? normalized.substring(5) : normalized;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString();
}

function fromReview(review: CourseReview): ReviewFormState {
  return {
    rating: review.rating,
    difficultyRating: review.difficultyRating ?? null,
    workloadRating: review.workloadRating ?? null,
    wouldTakeAgain:
      review.wouldTakeAgain === null || review.wouldTakeAgain === undefined
        ? ''
        : review.wouldTakeAgain
          ? 'yes'
          : 'no',
    semesterTaken: review.semesterTaken ?? '',
    instructorName: review.instructorName ?? '',
    gradeReceived: review.gradeReceived ?? '',
    positives: review.positives ?? '',
    negatives: review.negatives ?? '',
    wouldLikeToSee: review.wouldLikeToSee ?? '',
    studyTips: review.studyTips ?? '',
    anonymous: review.anonymous,
  };
}

function toPayload(form: ReviewFormState) {
  return {
    rating: form.rating,
    difficultyRating: form.difficultyRating,
    workloadRating: form.workloadRating,
    wouldTakeAgain: form.wouldTakeAgain === '' ? null : form.wouldTakeAgain === 'yes',
    semesterTaken: form.semesterTaken.trim() || null,
    instructorName: form.instructorName.trim() || null,
    gradeReceived: form.gradeReceived.trim() || null,
    positives: form.positives.trim() || null,
    negatives: form.negatives.trim() || null,
    wouldLikeToSee: form.wouldLikeToSee.trim() || null,
    studyTips: form.studyTips.trim() || null,
    anonymous: form.anonymous,
  };
}

export default function CourseReviews() {
  const [queryInput, setQueryInput] = useState('');
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [summary, setSummary] = useState<CourseReviewSummary | null>(null);
  const [reviewsPage, setReviewsPage] = useState<CourseReviewPageResponse | null>(null);
  const [form, setForm] = useState<ReviewFormState>(DEFAULT_FORM);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewerRole] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return '';
      const parsed = JSON.parse(stored) as { role?: string };
      return normalizeRole(parsed.role);
    } catch {
      return '';
    }
  });

  const canReviewFromRole = viewerRole === 'USER' || viewerRole === 'STUDENT';
  const canReview = canReviewFromRole && Boolean(summary?.currentUserCanReview);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const runSearch = async (term: string) => {
    const cleaned = term.trim();
    setSearchLoading(true);
    setError(null);
    try {
      if (cleaned.length < 2) {
        setCourses([]);
        setSelectedCourseId(null);
        return;
      }
      const results = await searchCoursesForReviews(cleaned);
      setCourses(results ?? []);
      setSelectedCourseId((prev) => {
        if (prev && results.some((course) => course.id === prev)) {
          return prev;
        }
        return results.length ? results[0].id : null;
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to search courses.';
      setError(message);
      setCourses([]);
      setSelectedCourseId(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadSelectedCourseReviews = async (courseId: number) => {
    setDetailLoading(true);
    setError(null);
    try {
      const [summaryData, reviewsData] = await Promise.all([
        getCourseReviewSummary(courseId),
        getCourseReviews(courseId, { page: 0, size: 30 }),
      ]);
      setSummary(summaryData);
      setReviewsPage(reviewsData);
      setForm(summaryData.myReview ? fromReview(summaryData.myReview) : DEFAULT_FORM);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load course reviews.';
      setError(message);
      setSummary(null);
      setReviewsPage(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedCourseId) {
      setSummary(null);
      setReviewsPage(null);
      setForm(DEFAULT_FORM);
      return;
    }
    void loadSelectedCourseReviews(selectedCourseId);
  }, [selectedCourseId]);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch(queryInput);
  };

  const saveReview = async () => {
    if (!selectedCourseId) return;
    setSavingReview(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = toPayload(form);
      if (summary?.myReview) {
        await updateMyCourseReview(selectedCourseId, payload);
        setSuccess('Your review was updated.');
      } else {
        await createCourseReview(selectedCourseId, payload);
        setSuccess('Your review was posted.');
      }
      await loadSelectedCourseReviews(selectedCourseId);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to save review.';
      setError(message);
    } finally {
      setSavingReview(false);
    }
  };

  const removeReview = async () => {
    if (!selectedCourseId || !summary?.myReview) return;
    setSavingReview(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteMyCourseReview(selectedCourseId);
      setSuccess('Your review was deleted.');
      await loadSelectedCourseReviews(selectedCourseId);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete review.';
      setError(message);
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Course Reviews</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">RateMyCourse Module</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Search courses, read student feedback, and leave your own review.
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
        </section>

        {(error || success) && (
          <div className="mt-4 space-y-2">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</div>}
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <form onSubmit={onSearch} className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Search Courses
              </label>
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Try: SE 3190"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Search
              </button>
              <p className="text-xs text-gray-500">Use at least 2 characters to run a search.</p>
            </form>

            <div className="mt-4 border-t border-gray-200 pt-4">
              {searchLoading ? (
                <div className="text-sm text-gray-600">Searching courses...</div>
              ) : (
                <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                  {courses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        selectedCourseId === course.id
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:border-red-200 hover:bg-red-50/60'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-800">
                        {course.courseIdent.replace('_', ' ')}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">{course.name}</div>
                      <div className="mt-1 text-xs text-gray-500">{course.credits} credits</div>
                    </button>
                  ))}
                  {courses.length === 0 && (
                    <div className="text-sm text-gray-600">No courses loaded. Run a search to begin.</div>
                  )}
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-4">
            {!selectedCourse && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
                Select a course to view and leave reviews.
              </div>
            )}

            {selectedCourse && detailLoading && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
                Loading course review data...
              </div>
            )}

            {selectedCourse && summary && !detailLoading && (
              <>
                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedCourse.courseIdent.replace('_', ' ')}
                      </h2>
                      <p className="mt-1 text-sm text-gray-700">{selectedCourse.name}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Credits: {selectedCourse.credits} | Offered: {selectedCourse.offered || 'TBD'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-slate-50 px-4 py-3 text-right">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Average Rating</div>
                      <div className="text-xl font-bold text-gray-900">{summary.averageRating.toFixed(2)} / 5</div>
                      <div className="text-xs text-gray-600">{summary.reviewCount} total reviews</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-5">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-center">
                        <div className="text-xs font-semibold text-gray-700">{rating}/5</div>
                        <div className="text-sm text-gray-600">{summary.ratingBreakdown[String(rating)] ?? 0}</div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">Student Reviews</h3>
                  <div className="mt-3 space-y-3">
                    {(reviewsPage?.reviews ?? []).map((review) => (
                      <div key={review.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-gray-800">
                              {review.reviewerDisplayName}
                              {review.anonymous && <span className="ml-2 text-xs text-gray-500">(Anonymous)</span>}
                            </div>
                            <div className="text-xs text-gray-500">{formatDateTime(review.createdAt)}</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-700">{review.rating}/5</div>
                        </div>
                        <div className="mt-2 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
                          {review.semesterTaken && <div>Semester: {review.semesterTaken}</div>}
                          {review.instructorName && <div>Instructor: {review.instructorName}</div>}
                          {review.gradeReceived && <div>Grade: {review.gradeReceived}</div>}
                          {review.wouldTakeAgain !== null && (
                            <div>Would take again: {review.wouldTakeAgain ? 'Yes' : 'No'}</div>
                          )}
                          {review.difficultyRating !== null && <div>Difficulty: {review.difficultyRating}/5</div>}
                          {review.workloadRating !== null && <div>Workload: {review.workloadRating}/5</div>}
                        </div>
                        {review.positives && (
                          <p className="mt-2 text-sm text-gray-700">
                            <span className="font-semibold">Positives: </span>
                            {review.positives}
                          </p>
                        )}
                        {review.negatives && (
                          <p className="mt-1 text-sm text-gray-700">
                            <span className="font-semibold">Negatives: </span>
                            {review.negatives}
                          </p>
                        )}
                        {review.wouldLikeToSee && (
                          <p className="mt-1 text-sm text-gray-700">
                            <span className="font-semibold">Would like to see: </span>
                            {review.wouldLikeToSee}
                          </p>
                        )}
                        {review.studyTips && (
                          <p className="mt-1 text-sm text-gray-700">
                            <span className="font-semibold">Tips: </span>
                            {review.studyTips}
                          </p>
                        )}
                      </div>
                    ))}
                    {(reviewsPage?.reviews?.length ?? 0) === 0 && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                        No reviews yet for this course.
                      </div>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {summary.myReview ? 'Edit Your Review' : 'Leave a Review'}
                    </h3>
                    {!canReview && (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        Only student accounts can submit reviews.
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Overall Rating
                      </label>
                      <select
                        value={form.rating}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, rating: Number(event.target.value) }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-48"
                        disabled={!canReview || savingReview}
                      >
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <option key={rating} value={rating}>
                            {rating} / 5
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={form.semesterTaken}
                        onChange={(event) => setForm((prev) => ({ ...prev, semesterTaken: event.target.value }))}
                        placeholder="Semester taken (example: Spring 2026)"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        disabled={!canReview || savingReview}
                      />
                      <input
                        value={form.instructorName}
                        onChange={(event) => setForm((prev) => ({ ...prev, instructorName: event.target.value }))}
                        placeholder="Instructor name (optional)"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        disabled={!canReview || savingReview}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setAdvancedOpen((prev) => !prev)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      {advancedOpen ? 'Hide advanced fields' : 'Show advanced fields'}
                    </button>

                    {advancedOpen && (
                      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <select
                            value={form.difficultyRating ?? ''}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                difficultyRating: event.target.value ? Number(event.target.value) : null,
                              }))
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={!canReview || savingReview}
                          >
                            <option value="">Difficulty (optional)</option>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <option key={rating} value={rating}>
                                {rating}/5
                              </option>
                            ))}
                          </select>
                          <select
                            value={form.workloadRating ?? ''}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                workloadRating: event.target.value ? Number(event.target.value) : null,
                              }))
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={!canReview || savingReview}
                          >
                            <option value="">Workload (optional)</option>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <option key={rating} value={rating}>
                                {rating}/5
                              </option>
                            ))}
                          </select>
                          <select
                            value={form.wouldTakeAgain}
                            onChange={(event) => setForm((prev) => ({ ...prev, wouldTakeAgain: event.target.value }))}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={!canReview || savingReview}
                          >
                            <option value="">Would take again? (optional)</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>

                        <input
                          value={form.gradeReceived}
                          onChange={(event) => setForm((prev) => ({ ...prev, gradeReceived: event.target.value }))}
                          placeholder="Grade received (optional)"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          disabled={!canReview || savingReview}
                        />
                        <textarea
                          value={form.positives}
                          onChange={(event) => setForm((prev) => ({ ...prev, positives: event.target.value }))}
                          placeholder="Positives"
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          disabled={!canReview || savingReview}
                        />
                        <textarea
                          value={form.negatives}
                          onChange={(event) => setForm((prev) => ({ ...prev, negatives: event.target.value }))}
                          placeholder="Negatives"
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          disabled={!canReview || savingReview}
                        />
                        <textarea
                          value={form.wouldLikeToSee}
                          onChange={(event) => setForm((prev) => ({ ...prev, wouldLikeToSee: event.target.value }))}
                          placeholder="What would you like to see improved?"
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          disabled={!canReview || savingReview}
                        />
                        <textarea
                          value={form.studyTips}
                          onChange={(event) => setForm((prev) => ({ ...prev, studyTips: event.target.value }))}
                          placeholder="Tips for future students"
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          disabled={!canReview || savingReview}
                        />

                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={form.anonymous}
                            onChange={(event) => setForm((prev) => ({ ...prev, anonymous: event.target.checked }))}
                            disabled={!canReview || savingReview}
                          />
                          Post review anonymously
                        </label>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={saveReview}
                        disabled={!canReview || savingReview}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                      >
                        {summary.myReview ? 'Update Review' : 'Post Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(summary.myReview ? fromReview(summary.myReview) : DEFAULT_FORM)}
                        disabled={!canReview || savingReview}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reset Form
                      </button>
                      {summary.myReview && (
                        <button
                          type="button"
                          onClick={removeReview}
                          disabled={!canReview || savingReview}
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete My Review
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
