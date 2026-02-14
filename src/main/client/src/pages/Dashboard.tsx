// Dashboard.tsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ImportProgressReport from '../components/ImportProgressReport';
import Flowchart from '../components/Flowchart';
import {
  createFlowchartComment,
  deleteFlowchartComment,
  dismissFlowchartComment,
  getFlowchartComments,
  getFlowchartByUserId,
  getFlowchartInsights,
  getFlowchartInsightsByUserId,
  getFlowchartRequirementCoverage,
  getFlowchartRequirementCoverageByUserId,
  getUserFlowchart,
  updateFlowchartComment,
  updateSemesterCourses,
} from '../api/flowchartApi';
import type { Course as FlowchartCourse, Flowchart as FlowchartType, FlowchartComment } from '../api/flowchartApi';
import type { FlowchartInsights } from '../api/flowchartApi';
import type { FlowchartRequirementCoverage } from '../api/flowchartApi';
import Header from '../components/header';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';
import { createStatusLookup, normalizeCourseIdent, normalizeStatus, resolveCourseStatus } from '../utils/flowchartStatus';
import api from '../api/axiosClient';

function semesterRank(year: number, term: string): number {
  const order: Record<string, number> = {
    SPRING: 1,
    SUMMER: 2,
    FALL: 3,
  };
  const termRank = order[term?.toUpperCase()] ?? 9;
  return year * 10 + termRank;
}

function normalizeRole(role: string | null | undefined): string {
  if (!role) return '';
  const normalized = role.trim().toUpperCase();
  return normalized.startsWith('ROLE_') ? normalized.substring(5) : normalized;
}

function formatCommentDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleString();
}

export default function Dashboard() {
  const [searchParams] = useSearchParams();
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
  const [insights, setInsights] = useState<FlowchartInsights | null>(null);
  const [requirementCoverage, setRequirementCoverage] = useState<FlowchartRequirementCoverage | null>(null);
  const [showRequirementCoverage, setShowRequirementCoverage] = useState(false);
  const [showProgressInsights, setShowProgressInsights] = useState(false);
  const [showMiniCatalog, setShowMiniCatalog] = useState(false);
  const [miniCourses, setMiniCourses] = useState<FlowchartCourse[]>([]);
  const [miniCatalogLoading, setMiniCatalogLoading] = useState(false);
  const [miniCatalogError, setMiniCatalogError] = useState<string | null>(null);
  const [miniCatalogMessage, setMiniCatalogMessage] = useState<string | null>(null);
  const [miniSearchTerm, setMiniSearchTerm] = useState('');
  const [miniLevel, setMiniLevel] = useState('');
  const [miniOfferedTerm, setMiniOfferedTerm] = useState('');
  const [miniDepartment, setMiniDepartment] = useState('');
  const [miniAddingCourseIdent, setMiniAddingCourseIdent] = useState<string | null>(null);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showDismissedComments, setShowDismissedComments] = useState(false);
  const [comments, setComments] = useState<FlowchartComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentActionLoadingId, setCommentActionLoadingId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const requestedStudentId = Number(searchParams.get('studentId'));
  const targetStudentId = Number.isFinite(requestedStudentId) && requestedStudentId > 0 ? requestedStudentId : null;
  const readOnlyMode = searchParams.get('readOnly') === '1' && targetStudentId !== null;
  const viewedStudentName = (searchParams.get('studentName') ?? '').trim();
  const viewedStudentLabel = viewedStudentName || (targetStudentId ? `Student #${targetStudentId}` : 'student');
  const currentUserRole = (() => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return '';
      const parsed = JSON.parse(stored) as { role?: string };
      return normalizeRole(parsed.role);
    } catch {
      return '';
    }
  })();
  const canDismissComments = !readOnlyMode || currentUserRole === 'ADMIN';

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
  const visibleComments = showDismissedComments ? comments : comments.filter((comment) => !comment.dismissed);

  const loadInsightsAndCoverage = async () => {
    try {
      const [insightData, coverageData] =
        readOnlyMode && targetStudentId !== null
          ? await Promise.all([
              getFlowchartInsightsByUserId(targetStudentId),
              getFlowchartRequirementCoverageByUserId(targetStudentId),
            ])
          : await Promise.all([
              getFlowchartInsights(),
              getFlowchartRequirementCoverage(),
            ]);
      setInsights(insightData);
      setRequirementCoverage(coverageData);
    } catch (e) {
      console.error('Failed to load insights data:', e);
      setInsights(null);
      setRequirementCoverage(null);
    }
  };

  const reloadFlowchart = async (failMessage: string) => {
    try {
      const fc =
        readOnlyMode && targetStudentId !== null
          ? await getFlowchartByUserId(targetStudentId)
          : await getUserFlowchart();
      setFlowchart(fc);
      if (showProgressInsights && fc) {
        await loadInsightsAndCoverage();
      }
      return fc;
    } catch (e) {
      console.error('Failed to load flowchart:', e);
      setFlowchart(null);
      setInsights(null);
      setRequirementCoverage(null);
      const message = (e as any)?.response?.data?.message || failMessage;
      setError(message);
      return null;
    }
  };

  const loadMiniCatalogCourses = async (overrides?: {
    searchTerm?: string;
    level?: string;
    offeredTerm?: string;
    department?: string;
  }) => {
    setMiniCatalogLoading(true);
    setMiniCatalogError(null);
    try {
      const search = (overrides?.searchTerm ?? miniSearchTerm).trim();
      const level = overrides?.level ?? miniLevel;
      const offeredTerm = overrides?.offeredTerm ?? miniOfferedTerm;
      const department = (overrides?.department ?? miniDepartment).trim().toUpperCase();
      if (search) {
        const res = await api.get<FlowchartCourse[]>('/courses/search', {
          params: { searchTerm: search },
        });
        setMiniCourses(res.data ?? []);
      } else if (level || offeredTerm || department) {
        const res = await api.get<FlowchartCourse[]>('/courses/filter', {
          params: {
            level: level || undefined,
            offeredTerm: offeredTerm || undefined,
            department: department || undefined,
            page: 0,
            size: 100,
          },
        });
        setMiniCourses(res.data ?? []);
      } else {
        const res = await api.get<FlowchartCourse[]>('/courses/page', {
          params: { page: 0, size: 100 },
        });
        setMiniCourses(res.data ?? []);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load mini catalog.';
      setMiniCatalogError(message);
      setMiniCourses([]);
    } finally {
      setMiniCatalogLoading(false);
    }
  };

  const loadComments = async (flowchartId: number) => {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const data = await getFlowchartComments(flowchartId);
      setComments(data);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load comments.';
      setCommentsError(message);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCreateComment = async () => {
    if (!flowchart) return;
    const body = commentDraft.trim();
    if (!body) {
      setCommentsError('Comment text cannot be empty.');
      return;
    }

    setCommentSubmitting(true);
    setCommentsError(null);
    try {
      const created = await createFlowchartComment(flowchart.id, { body, noteX: null, noteY: null });
      setComments((current) => [created, ...current]);
      setCommentDraft('');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to save comment.';
      setCommentsError(message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleStartEditComment = (comment: FlowchartComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
    setCommentsError(null);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentBody('');
  };

  const handleSaveEditedComment = async (comment: FlowchartComment) => {
    const body = editingCommentBody.trim();
    if (!body) {
      setCommentsError('Comment text cannot be empty.');
      return;
    }

    setCommentActionLoadingId(comment.id);
    setCommentsError(null);
    try {
      const updated = await updateFlowchartComment(comment.id, {
        body,
        noteX: comment.noteX,
        noteY: comment.noteY,
      });
      setComments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingCommentId(null);
      setEditingCommentBody('');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update comment.';
      setCommentsError(message);
    } finally {
      setCommentActionLoadingId(null);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    setCommentActionLoadingId(commentId);
    setCommentsError(null);
    try {
      await deleteFlowchartComment(commentId);
      setComments((current) => current.filter((item) => item.id !== commentId));
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentBody('');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete comment.';
      setCommentsError(message);
    } finally {
      setCommentActionLoadingId(null);
    }
  };

  const handleDismissComment = async (comment: FlowchartComment, dismissed: boolean) => {
    setCommentActionLoadingId(comment.id);
    setCommentsError(null);
    try {
      const updated = await dismissFlowchartComment(comment.id, dismissed);
      setComments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update comment visibility.';
      setCommentsError(message);
    } finally {
      setCommentActionLoadingId(null);
    }
  };

  // Load saved flowchart when dashboard loads
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      await reloadFlowchart(
        readOnlyMode
          ? 'Failed to load selected student flowchart. Please refresh and try again.'
          : 'Failed to load your flowchart. Please refresh and try again.'
      );
      setLoading(false);
    }
    void load();
  }, [readOnlyMode, targetStudentId]);

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

  useEffect(() => {
    if (!showProgressInsights || !flowchart) {
      return;
    }
    void loadInsightsAndCoverage();
  }, [showProgressInsights, flowchart?.id]);

  useEffect(() => {
    if (readOnlyMode || !showMiniCatalog) {
      return;
    }
    void loadMiniCatalogCourses();
  }, [showMiniCatalog, readOnlyMode]);

  useEffect(() => {
    if (!readOnlyMode) {
      return;
    }
    setShowMiniCatalog(false);
    setShowCommentsPanel(true);
  }, [readOnlyMode]);

  useEffect(() => {
    if (!flowchart) {
      setComments([]);
      return;
    }
    void loadComments(flowchart.id);
  }, [flowchart?.id]);

  // After import completes, reload flowchart from backend
  const handleImportComplete = async () => {
    if (readOnlyMode) return;
    setLoading(true);
    setError(null);
    await reloadFlowchart('Import succeeded, but loading the flowchart failed. Please refresh.');
    setLoading(false);
  };

  const handleAddCourse = async () => {
    if (readOnlyMode) return;
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
    if (readOnlyMode) return;
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
    if (readOnlyMode) return;
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

  const handleAddMiniCourse = async (course: FlowchartCourse) => {
    if (readOnlyMode) return;
    if (selectedSemesterId === null) {
      setMiniCatalogError('Select a semester before adding a course.');
      return;
    }

    setMiniAddingCourseIdent(course.courseIdent);
    setMiniCatalogError(null);
    setMiniCatalogMessage(null);
    try {
      await updateSemesterCourses(selectedSemesterId, {
        operation: 'ADD',
        courseIdent: course.courseIdent,
      });
      await reloadFlowchart('Course was added, but reloading the flowchart failed. Please refresh.');
      setMiniCatalogMessage(`Added ${course.courseIdent} to your flowchart.`);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to add selected course to your flowchart.';
      setMiniCatalogError(message);
    } finally {
      setMiniAddingCourseIdent(null);
    }
  };

  const handleApplyMiniFilters = async () => {
    setMiniCatalogMessage(null);
    setMiniCatalogError(null);
    await loadMiniCatalogCourses({
      searchTerm: miniSearchTerm,
      level: miniLevel,
      offeredTerm: miniOfferedTerm,
      department: miniDepartment,
    });
  };

  const handleResetMiniFilters = async () => {
    setMiniSearchTerm('');
    setMiniLevel('');
    setMiniOfferedTerm('');
    setMiniDepartment('');
    setMiniCatalogMessage(null);
    setMiniCatalogError(null);
    await loadMiniCatalogCourses({
      searchTerm: '',
      level: '',
      offeredTerm: '',
      department: '',
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Logo Section */}
      <Header></Header>
      <div className="flex h-full w-full gap-6 overflow-hidden p-6 pt-24">
        <div className="w-[320px] shrink-0">
          {readOnlyMode ? (
            <div className="p-4 w-full">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
                <div className="font-semibold text-slate-900">Read-Only Mode</div>
                <div className="mt-1">Viewing {viewedStudentLabel}'s flowchart.</div>
                <div className="mt-1 text-xs text-slate-500">
                  Upload and course edits are disabled in advisor view.
                </div>
              </div>
              <Link
                to="/student-search"
                className="mt-3 block rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50"
              >
                Back to Student Search
              </Link>
            </div>
          ) : (
            <>
              <div className="p-4 w-full">
                <ImportProgressReport onImported={handleImportComplete} />
              </div>
              <div className="p-4 w-full">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="w-full text-center"
                    label={showMiniCatalog ? 'Hide Mini Catalog' : 'Mini Catalog'}
                    icon="pi pi-book"
                    outlined
                    onClick={() => {
                      setShowMiniCatalog((value) => {
                        const next = !value;
                        if (next) {
                          setShowCommentsPanel(false);
                        }
                        setMiniCatalogMessage(null);
                        setMiniCatalogError(null);
                        return next;
                      });
                    }}
                  />
                  <Link
                    to="/catalog"
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50"
                  >
                    <i className="pi pi-external-link mr-2 text-red-500"></i>
                    Course Catalog
                  </Link>
                </div>
              </div>
            </>
          )}
          <div className="p-4 w-full">
            <Button
              className="w-full text-center"
              label={showProgressInsights ? 'Hide Degree Progress & Insights' : 'Show Degree Progress & Insights'}
              icon="pi pi-chart-line"
              outlined
              onClick={() => {
                setShowProgressInsights((value) => !value);
                if (showProgressInsights) {
                  setShowRequirementCoverage(false);
                }
              }}
            />
          </div>
          <div className="p-4 w-full">
            <Button
              className="w-full text-center"
              label={showCommentsPanel ? 'Hide Flowchart Notes' : 'Flowchart Notes'}
              icon="pi pi-comments"
              outlined
              onClick={() => {
                setShowCommentsPanel((value) => {
                  const next = !value;
                  if (next) {
                    setShowMiniCatalog(false);
                  }
                  return next;
                });
              }}
            />
          </div>
          {!readOnlyMode && (
            <>
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
                <div className="pt-2">
                  <Button
                    className="w-full text-center"
                    label={updatingSemester ? 'Removing...' : 'Remove Course'}
                    severity="danger"
                    outlined
                    onClick={handleRemoveCourse}
                    disabled={!flowchart || updatingSemester}
                  />
                </div>
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
            </>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <ProgressSpinner style={{ width: '56px', height: '56px' }} />
            </div>
          ) : (
            <>
          {error && <div className="text-center text-red-600 pt-4">{error}</div>}
          {flowchart ? (
            <div className="flex h-full flex-col items-center">
              <div className="flex h-full w-full max-w-[1320px] flex-col gap-4 xl:flex-row">
                <div className="min-w-0 flex-1">
                  {showProgressInsights && (
                    <div className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-slate-700">
                      <span>Degree Progress & Planning Insights</span>
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
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <span>{inProgressCount} course(s) currently in progress</span>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-emerald-300 bg-emerald-500" />
                        Completed
                        <span className="ml-2 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-amber-300 bg-amber-500" />
                        In progress
                      </span>
                    </div>

                    {insights && (
                      <>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700 lg:grid-cols-4">
                          <div className="rounded-md bg-slate-50 px-3 py-2">
                            <div className="text-slate-500">Applied</div>
                            <div className="font-semibold text-slate-900">
                              {insights.appliedCredits} / {insights.totalCredits}
                            </div>
                          </div>
                          <div className="rounded-md bg-slate-50 px-3 py-2">
                            <div className="text-slate-500">Remaining</div>
                            <div className="font-semibold text-slate-900">{insights.remainingCredits}</div>
                          </div>
                          <div className="rounded-md bg-slate-50 px-3 py-2">
                            <div className="text-slate-500">Projected Grad</div>
                            <div className="font-semibold text-slate-900">{insights.projectedGraduationTerm}</div>
                          </div>
                          <div className="rounded-md bg-slate-50 px-3 py-2">
                            <div className="text-slate-500">Terms Left</div>
                            <div className="font-semibold text-slate-900">{insights.estimatedTermsToGraduate}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs">
                          {insights.riskFlags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {insights.riskFlags.map((flag) => (
                                <span
                                  key={flag}
                                  className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800"
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                              No immediate risk flags detected.
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    {requirementCoverage && requirementCoverage.totalRequirements > 0 && (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <button
                          type="button"
                          className="flex w-full flex-wrap items-center justify-between gap-2 text-left text-xs text-slate-600"
                          onClick={() => setShowRequirementCoverage((value) => !value)}
                        >
                          <span className="font-semibold text-slate-700">
                            Requirement Coverage {showRequirementCoverage ? '(hide)' : '(show)'}
                          </span>
                          <span>
                            {requirementCoverage.satisfiedRequirements} satisfied,{' '}
                            {requirementCoverage.inProgressRequirements} in progress,{' '}
                            {requirementCoverage.unmetRequirements} unmet
                          </span>
                        </button>
                        {showRequirementCoverage && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            {requirementCoverage.requirements.map((item) => (
                              <div
                                key={item.name}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs"
                              >
                                <span className="font-medium text-slate-700">{item.name}</span>
                                <span className="text-slate-600">
                                  {item.completedCredits} completed + {item.inProgressCredits} in progress /{' '}
                                  {item.requiredCredits}
                                  {item.remainingCredits > 0 ? ` (${item.remainingCredits} left)` : ' (done)'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  )}
                  <Flowchart flowchart={flowchart} onCourseSelect={setSelectedCourse} />
                </div>
                {showCommentsPanel ? (
                  <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:w-[360px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                        Flowchart Notes
                      </div>
                      <button
                        type="button"
                        className="text-xs font-medium text-slate-500 hover:text-slate-700"
                        onClick={() => setShowDismissedComments((value) => !value)}
                      >
                        {showDismissedComments ? 'Hide dismissed' : 'Show dismissed'}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {readOnlyMode
                        ? 'Leave recommendations for the student to review later.'
                        : 'Review advisor recommendations and add your own notes.'}
                    </div>

                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full rounded-md border border-slate-300 p-2 text-sm"
                        rows={3}
                        placeholder="Add a recommendation or planning note..."
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        disabled={commentSubmitting}
                      />
                      <Button
                        className="w-full"
                        label={commentSubmitting ? 'Posting...' : 'Post Note'}
                        icon="pi pi-send"
                        onClick={() => void handleCreateComment()}
                        disabled={commentSubmitting || !flowchart}
                      />
                      {commentsError && <div className="text-xs text-red-600">{commentsError}</div>}
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Notes ({visibleComments.length})
                      </div>
                      <div className="max-h-[460px] space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                        {commentsLoading ? (
                          <div className="p-2 text-sm text-slate-600">Loading notes...</div>
                        ) : visibleComments.length === 0 ? (
                          <div className="p-2 text-sm text-slate-600">No notes yet.</div>
                        ) : (
                          visibleComments.map((comment) => (
                            <div
                              key={comment.id}
                              className={`rounded-md border p-2 text-sm ${
                                comment.dismissed
                                  ? 'border-slate-200 bg-slate-100 text-slate-500'
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-slate-800">{comment.authorName}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {normalizeRole(comment.authorRole) || 'USER'}
                                    {comment.updatedAt ? ` - ${formatCommentDate(comment.updatedAt)}` : ''}
                                  </div>
                                </div>
                                {comment.dismissed && (
                                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    dismissed
                                  </span>
                                )}
                              </div>

                              {editingCommentId === comment.id ? (
                                <textarea
                                  className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
                                  rows={3}
                                  value={editingCommentBody}
                                  onChange={(e) => setEditingCommentBody(e.target.value)}
                                  disabled={commentActionLoadingId === comment.id}
                                />
                              ) : (
                                <div className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</div>
                              )}

                              <div className="mt-2 flex flex-wrap gap-2">
                                {editingCommentId === comment.id ? (
                                  <>
                                    <Button
                                      size="small"
                                      label="Save"
                                      onClick={() => void handleSaveEditedComment(comment)}
                                      disabled={commentActionLoadingId === comment.id}
                                    />
                                    <Button
                                      size="small"
                                      label="Cancel"
                                      outlined
                                      onClick={handleCancelEditComment}
                                      disabled={commentActionLoadingId === comment.id}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="small"
                                      label="Edit"
                                      text
                                      onClick={() => handleStartEditComment(comment)}
                                      disabled={commentActionLoadingId === comment.id}
                                    />
                                    <Button
                                      size="small"
                                      label="Delete"
                                      text
                                      severity="danger"
                                      onClick={() => void handleDeleteComment(comment.id)}
                                      disabled={commentActionLoadingId === comment.id}
                                    />
                                    {canDismissComments && (
                                      <Button
                                        size="small"
                                        label={comment.dismissed ? 'Restore' : 'Dismiss'}
                                        text
                                        onClick={() => void handleDismissComment(comment, !comment.dismissed)}
                                        disabled={commentActionLoadingId === comment.id}
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </aside>
                ) : showMiniCatalog ? (
                  <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:w-[360px]">
                    <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      Mini Course Catalog
                    </div>
                    <div className="mt-3 space-y-3">
                      <input
                        className="w-full rounded-md border border-slate-300 p-2 text-sm"
                        placeholder="Search by ident or title"
                        value={miniSearchTerm}
                        onChange={(e) => setMiniSearchTerm(e.target.value)}
                        disabled={miniCatalogLoading}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="w-full rounded-md border border-slate-300 p-2 text-sm"
                          value={miniLevel}
                          onChange={(e) => setMiniLevel(e.target.value)}
                          disabled={miniCatalogLoading}
                        >
                          <option value="">Any level</option>
                          <option value="1000">1000</option>
                          <option value="2000">2000</option>
                          <option value="3000">3000</option>
                          <option value="4000">4000</option>
                          <option value="5000">5000</option>
                        </select>
                        <select
                          className="w-full rounded-md border border-slate-300 p-2 text-sm"
                          value={miniOfferedTerm}
                          onChange={(e) => setMiniOfferedTerm(e.target.value)}
                          disabled={miniCatalogLoading}
                        >
                          <option value="">Any term</option>
                          <option value="SPRING">Spring</option>
                          <option value="SUMMER">Summer</option>
                          <option value="FALL">Fall</option>
                          <option value="WINTER">Winter</option>
                        </select>
                      </div>
                      <input
                        className="w-full rounded-md border border-slate-300 p-2 text-sm"
                        placeholder="Department (e.g. COMS)"
                        value={miniDepartment}
                        onChange={(e) => setMiniDepartment(e.target.value)}
                        disabled={miniCatalogLoading}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          className="w-full"
                          label={miniCatalogLoading ? 'Loading...' : 'Apply'}
                          onClick={() => void handleApplyMiniFilters()}
                          disabled={miniCatalogLoading}
                        />
                        <Button
                          className="w-full"
                          label="Reset"
                          outlined
                          onClick={() => void handleResetMiniFilters()}
                          disabled={miniCatalogLoading}
                        />
                      </div>
                      {miniCatalogError && <div className="text-xs text-red-600">{miniCatalogError}</div>}
                      {miniCatalogMessage && <div className="text-xs text-emerald-700">{miniCatalogMessage}</div>}
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Courses
                      </div>
                      <div className="max-h-[260px] space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                        {miniCatalogLoading ? (
                          <div className="p-2 text-sm text-slate-600">Loading courses...</div>
                        ) : miniCourses.length === 0 ? (
                          <div className="p-2 text-sm text-slate-600">No courses found.</div>
                        ) : (
                          miniCourses.map((course) => (
                            <div
                              key={course.courseIdent}
                              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-slate-700"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-semibold">{course.courseIdent.replace('_', ' ')}</div>
                                  <div className="line-clamp-1">{course.name}</div>
                                </div>
                                <Button
                                  className="shrink-0"
                                  size="small"
                                  label={miniAddingCourseIdent === course.courseIdent ? 'Adding...' : 'Add'}
                                  onClick={() => void handleAddMiniCourse(course)}
                                  disabled={
                                    selectedSemesterId === null ||
                                    miniAddingCourseIdent === course.courseIdent
                                  }
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {selectedSemesterId === null && (
                      <div className="mt-2 text-xs text-slate-500">
                        Select a semester in the left panel before adding.
                      </div>
                    )}
                  </aside>
                ) : selectedCourse ? (
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
                ) : null}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-600 pt-10">
              {readOnlyMode ? 'No flowchart found for this student.' : 'Upload a progress report to generate your flowchart.'}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
