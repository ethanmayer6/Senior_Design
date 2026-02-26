import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import {
  browseProfessors,
  createProfessorReview,
  deleteMyProfessorReview,
  getProfessorDirectoryStatus,
  getProfessorDepartments,
  getProfessorDetail,
  getProfessorReviews,
  updateMyProfessorReview,
  type ProfessorDetail,
  type ProfessorDirectoryStatus,
  type ProfessorReview,
  type ProfessorReviewPageResponse,
  type ProfessorSummary,
} from '../api/professorsApi';

type SortMode = 'name' | 'rating';

type ReviewFormState = {
  rating: number;
  difficultyRating: number | null;
  workloadRating: number | null;
  wouldTakeAgain: string;
  classTaken: string;
  periodTaken: string;
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
  classTaken: '',
  periodTaken: '',
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

function renderStars(value: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(value)));
  return `${'★'.repeat(clamped)}${'☆'.repeat(5 - clamped)}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString();
}

function fromReview(review: ProfessorReview): ReviewFormState {
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
    classTaken: review.classTaken ?? '',
    periodTaken: review.periodTaken ?? '',
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
    classTaken: form.classTaken.trim() || null,
    periodTaken: form.periodTaken.trim() || null,
    gradeReceived: form.gradeReceived.trim() || null,
    positives: form.positives.trim() || null,
    negatives: form.negatives.trim() || null,
    wouldLikeToSee: form.wouldLikeToSee.trim() || null,
    studyTips: form.studyTips.trim() || null,
    anonymous: form.anonymous,
  };
}

function StarPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`rounded px-1 text-xl transition ${n <= (value ?? 0) ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProfessorReviews() {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [directoryStatus, setDirectoryStatus] = useState<ProfessorDirectoryStatus | null>(null);
  const [sort, setSort] = useState<SortMode>('rating');
  const [page, setPage] = useState(0);
  const [professors, setProfessors] = useState<ProfessorSummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [selectedProfessorId, setSelectedProfessorId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [detail, setDetail] = useState<ProfessorDetail | null>(null);
  const [reviewsPage, setReviewsPage] = useState<ProfessorReviewPageResponse | null>(null);
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
  const canReview = canReviewFromRole && Boolean(detail?.currentUserCanReview);
  const directoryReady = Boolean(directoryStatus?.ready);
  const directorySeeding = Boolean(directoryStatus?.seeding);
  const directoryKnown = directoryStatus !== null;

  const selectedProfessor = useMemo(
    () => professors.find((p) => p.id === selectedProfessorId) ?? null,
    [professors, selectedProfessorId]
  );

  const loadDirectoryStatus = async () => {
    try {
      const status = await getProfessorDirectoryStatus();
      setDirectoryStatus(status);
      return status;
    } catch {
      setDirectoryStatus(null);
      return null;
    }
  };

  const loadDepartments = async () => {
    try {
      const values = await getProfessorDepartments();
      setDepartments(values ?? []);
    } catch {
      setDepartments([]);
    }
  };

  const loadProfessors = async () => {
    setListLoading(true);
    setError(null);
    try {
      const result = await browseProfessors({
        query: query || undefined,
        department: department || undefined,
        page,
        size: 20,
        sort,
      });
      setProfessors(result.professors ?? []);
      setTotalPages(result.totalPages ?? 0);
      setTotalElements(result.totalElements ?? 0);
      if (!selectedProfessorId && (result.professors?.length ?? 0) > 0) {
        setSelectedProfessorId(result.professors[0].id);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load professors.';
      setError(message);
      setProfessors([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setListLoading(false);
    }
  };

  const loadSelectedProfessor = async (professorId: number) => {
    setDetailLoading(true);
    setReviewsLoading(true);
    setError(null);
    try {
      const [detailData, reviewsData] = await Promise.all([
        getProfessorDetail(professorId),
        getProfessorReviews(professorId, { page: 0, size: 20 }),
      ]);
      setDetail(detailData);
      setReviewsPage(reviewsData);
      if (detailData.myReview) {
        setForm(fromReview(detailData.myReview));
      } else {
        setForm(DEFAULT_FORM);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load professor details.';
      setError(message);
      setDetail(null);
      setReviewsPage(null);
    } finally {
      setDetailLoading(false);
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timerId: number | null = null;

    const pollStatus = async () => {
      const status = await loadDirectoryStatus();
      if (cancelled) return;
      if (!status?.ready) {
        timerId = window.setTimeout(() => {
          void pollStatus();
        }, 2500);
      }
    };

    void pollStatus();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  useEffect(() => {
    if (!directoryReady) {
      setDepartments([]);
      return;
    }
    void loadDepartments();
  }, [directoryReady]);

  useEffect(() => {
    if (!directoryReady) {
      setProfessors([]);
      setTotalPages(0);
      setTotalElements(0);
      return;
    }
    void loadProfessors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, department, sort, page, directoryReady]);

  useEffect(() => {
    if (!selectedProfessorId) return;
    void loadSelectedProfessor(selectedProfessorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfessorId]);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setQuery(queryInput.trim());
  };

  const saveReview = async () => {
    if (!selectedProfessorId) return;
    setSavingReview(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = toPayload(form);
      if (detail?.myReview) {
        await updateMyProfessorReview(selectedProfessorId, payload);
        setSuccess('Your review was updated.');
      } else {
        await createProfessorReview(selectedProfessorId, payload);
        setSuccess('Your review was posted.');
      }
      await loadSelectedProfessor(selectedProfessorId);
      await loadProfessors();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to save review.';
      setError(message);
    } finally {
      setSavingReview(false);
    }
  };

  const removeReview = async () => {
    if (!selectedProfessorId || !detail?.myReview) return;
    setSavingReview(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteMyProfessorReview(selectedProfessorId);
      setForm(DEFAULT_FORM);
      setSuccess('Your review was deleted.');
      await loadSelectedProfessor(selectedProfessorId);
      await loadProfessors();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete review.';
      setError(message);
    } finally {
      setSavingReview(false);
    }
  };

  const ratingBreakdown = detail?.ratingBreakdown ?? {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Professor Reviews</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">RateMyProfessor Module</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Browse Iowa State professors, read peer/advisor-visible feedback, and leave highly customizable reviews.
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
                Search Professors
              </label>
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Name or keyword"
                disabled={!directoryReady}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={department}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setPage(0);
                }}
                disabled={!directoryReady}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as SortMode);
                  setPage(0);
                }}
                disabled={!directoryReady}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="rating">Highest Rated</option>
                <option value="name">Name (A-Z)</option>
              </select>
              <button
                type="submit"
                disabled={!directoryReady}
                className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Search
              </button>
            </form>

            <div className="mt-4 border-t border-gray-200 pt-4">
              {!directoryReady ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                  {directorySeeding
                    ? 'The Iowa State professor directory is still loading for this environment. Search will unlock as soon as seeding finishes.'
                    : directoryKnown
                      ? 'The professor directory is currently empty. If this is a fresh environment, give startup another moment.'
                      : 'Checking professor directory status...'}
                </div>
              ) : (
                <p className="text-xs text-gray-500">{totalElements} professor results</p>
              )}
              {directoryReady && listLoading ? (
                <div className="mt-3 text-sm text-gray-600">Loading professors...</div>
              ) : directoryReady ? (
                <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                  {professors.map((professor) => (
                    <button
                      key={professor.id}
                      type="button"
                      onClick={() => setSelectedProfessorId(professor.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        selectedProfessorId === professor.id
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:border-red-200 hover:bg-red-50/60'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-800">{professor.fullName}</div>
                      <div className="mt-1 text-xs text-gray-600">{professor.department || 'Department not listed'}</div>
                      <div className="mt-1 text-xs text-amber-600">
                        {renderStars(professor.averageRating)} ({professor.reviewCount})
                      </div>
                    </button>
                  ))}
                  {professors.length === 0 && <div className="text-sm text-gray-600">No professors found.</div>}
                </div>
              ) : null}

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  disabled={!directoryReady || page <= 0}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500">
                  {directoryReady ? `Page ${totalPages === 0 ? 0 : page + 1} / ${totalPages}` : 'Directory loading'}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
                  disabled={!directoryReady || page + 1 >= totalPages}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            {!directoryReady && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm">
                {directorySeeding
                  ? 'CourseFlow is importing the Iowa State professor directory for this environment. Refresh is not required; the page will unlock automatically when it finishes.'
                  : 'Waiting for the professor directory to become available.'}
              </div>
            )}

            {directoryReady && !selectedProfessorId && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
                Select a professor to view details and reviews.
              </div>
            )}

            {directoryReady && selectedProfessorId && detailLoading && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
                Loading professor details...
              </div>
            )}

            {directoryReady && selectedProfessorId && detail && (
              <>
                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{detail.fullName}</h2>
                      <p className="mt-1 text-sm text-gray-700">{detail.title || 'Title not listed'}</p>
                      <p className="mt-1 text-sm text-gray-600">{detail.department || 'Department not listed'}</p>
                      {detail.email && <p className="mt-1 text-sm text-gray-600">{detail.email}</p>}
                      {detail.profileUrl && (
                        <a
                          href={detail.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-sm font-medium text-red-600 hover:underline"
                        >
                          View Faculty Profile
                        </a>
                      )}
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-slate-50 px-4 py-3 text-right">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Average Rating</div>
                      <div className="text-xl font-bold text-gray-900">{detail.averageRating.toFixed(2)} / 5</div>
                      <div className="text-xs text-amber-600">{renderStars(detail.averageRating)}</div>
                      <div className="text-xs text-gray-600">{detail.reviewCount} total reviews</div>
                    </div>
                  </div>

                  {detail.bio && (
                    <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                      {detail.bio}
                    </p>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-5">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-center">
                        <div className="text-xs font-semibold text-gray-700">{rating}★</div>
                        <div className="text-sm text-gray-600">{ratingBreakdown[String(rating)] ?? 0}</div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Student Reviews</h3>
                    {reviewsLoading && <span className="text-xs text-gray-500">Loading...</span>}
                  </div>
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
                          <div className="text-sm font-semibold text-amber-600">
                            {renderStars(review.rating)} ({review.rating}/5)
                          </div>
                        </div>
                        <div className="mt-2 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
                          {review.classTaken && <div>Class: {review.classTaken}</div>}
                          {review.periodTaken && <div>Period: {review.periodTaken}</div>}
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
                        No reviews yet for this professor.
                      </div>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {detail.myReview ? 'Edit Your Review' : 'Leave a Review'}
                    </h3>
                    {!canReview && (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        Only student accounts can submit reviews.
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Overall Rating</label>
                      <StarPicker
                        value={form.rating}
                        onChange={(next) => setForm((prev) => ({ ...prev, rating: next }))}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={form.classTaken}
                        onChange={(event) => setForm((prev) => ({ ...prev, classTaken: event.target.value }))}
                        placeholder="Class taken (example: COM S 3270)"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        disabled={!canReview || savingReview}
                      />
                      <input
                        value={form.periodTaken}
                        onChange={(event) => setForm((prev) => ({ ...prev, periodTaken: event.target.value }))}
                        placeholder="Period taken (example: Fall 2025)"
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
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Difficulty</label>
                            <StarPicker
                              value={form.difficultyRating}
                              onChange={(next) => setForm((prev) => ({ ...prev, difficultyRating: next }))}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Workload</label>
                            <StarPicker
                              value={form.workloadRating}
                              onChange={(next) => setForm((prev) => ({ ...prev, workloadRating: next }))}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            value={form.wouldTakeAgain}
                            onChange={(event) => setForm((prev) => ({ ...prev, wouldTakeAgain: event.target.value }))}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={!canReview || savingReview}
                          >
                            <option value="">Would take again? (Optional)</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                          <input
                            value={form.gradeReceived}
                            onChange={(event) => setForm((prev) => ({ ...prev, gradeReceived: event.target.value }))}
                            placeholder="Grade received (optional)"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={!canReview || savingReview}
                          />
                        </div>

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
                        {detail.myReview ? 'Update Review' : 'Post Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(detail.myReview ? fromReview(detail.myReview) : DEFAULT_FORM)}
                        disabled={!canReview || savingReview}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reset Form
                      </button>
                      {detail.myReview && (
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

            {selectedProfessorId && !selectedProfessor && !listLoading && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
                The selected professor is not in the current page results. Adjust filters or choose another profile.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
