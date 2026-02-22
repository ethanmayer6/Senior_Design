// Dashboard.tsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ImportProgressReport from '../components/ImportProgressReport';
import Flowchart from '../components/Flowchart';
import {
  createFlowchartRequiredChange,
  deleteFlowchart,
  createFlowchartComment,
  deleteFlowchartComment,
  deleteFlowchartRequiredChange,
  dismissFlowchartComment,
  getFlowchartInsightsByFlowchartId,
  getFlowchartComments,
  getFlowchartByUserId,
  getFlowchartInsights,
  getFlowchartReview,
  getFlowchartRequiredChanges,
  getFlowchartInsightsByUserId,
  getFlowchartRequirementCoverageByFlowchartId,
  getFlowchartRequirementCoverage,
  getFlowchartRequirementCoverageByUserId,
  getMyFlowchartById,
  getMyFlowcharts,
  getUserFlowchart,
  updateFlowchartRequiredChange,
  updateFlowchartReview,
  updateFlowchartComment,
  updateSemesterCourses,
} from '../api/flowchartApi';
import type {
  Course as FlowchartCourse,
  Flowchart as FlowchartType,
  FlowchartComment,
  FlowchartRequiredChange,
  FlowchartReview,
  FlowchartReviewStatus,
  FlowchartTab
} from '../api/flowchartApi';
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
  const [replyParentCommentId, setReplyParentCommentId] = useState<number | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentActionLoadingId, setCommentActionLoadingId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [flowchartReview, setFlowchartReview] = useState<FlowchartReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewNotesDraft, setReviewNotesDraft] = useState('');
  const [requiredChanges, setRequiredChanges] = useState<FlowchartRequiredChange[]>([]);
  const [requiredChangesLoading, setRequiredChangesLoading] = useState(false);
  const [requiredChangesError, setRequiredChangesError] = useState<string | null>(null);
  const [requiredChangeDraft, setRequiredChangeDraft] = useState('');
  const [requiredChangeActionLoadingId, setRequiredChangeActionLoadingId] = useState<number | null>(null);
  const [flowchartTabs, setFlowchartTabs] = useState<FlowchartTab[]>([]);
  const [activeFlowchartId, setActiveFlowchartId] = useState<number | null>(null);
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
  const canReviewFlowchart = currentUserRole === 'ADVISOR' || currentUserRole === 'FACULTY' || currentUserRole === 'ADMIN';
  const maxFlowchartTabs = 10;
  const canCreateMoreFlowcharts = flowchartTabs.length < maxFlowchartTabs;
  const activeFlowchartStorageKey = (() => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return null;
      const parsed = JSON.parse(stored) as { id?: number };
      if (!parsed?.id) return null;
      return `activeFlowchartId:${parsed.id}`;
    } catch {
      return null;
    }
  })();

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
  const commentDepthMap = (() => {
    const byId = new Map<number, FlowchartComment>();
    comments.forEach((comment) => byId.set(comment.id, comment));
    const cache = new Map<number, number>();
    const depthFor = (comment: FlowchartComment): number => {
      if (cache.has(comment.id)) return cache.get(comment.id)!;
      let depth = 0;
      let cursor = comment;
      const seen = new Set<number>([comment.id]);
      while (cursor.parentCommentId) {
        const parent = byId.get(cursor.parentCommentId);
        if (!parent || seen.has(parent.id)) break;
        depth += 1;
        seen.add(parent.id);
        cursor = parent;
      }
      const normalized = Math.min(depth, 4);
      cache.set(comment.id, normalized);
      return normalized;
    };
    return cache.size === comments.length ? cache : new Map(comments.map((c) => [c.id, depthFor(c)]));
  })();

  const reviewStatusStyles: Record<FlowchartReviewStatus, string> = {
    PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
    APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  const loadInsightsAndCoverage = async () => {
    try {
      const [insightData, coverageData] =
        readOnlyMode && targetStudentId !== null
          ? await Promise.all([
              getFlowchartInsightsByUserId(targetStudentId),
              getFlowchartRequirementCoverageByUserId(targetStudentId),
            ])
          : activeFlowchartId !== null
            ? await Promise.all([
                getFlowchartInsightsByFlowchartId(activeFlowchartId),
                getFlowchartRequirementCoverageByFlowchartId(activeFlowchartId),
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

  const reloadFlowchartTabs = async (): Promise<FlowchartTab[]> => {
    if (readOnlyMode) return [];
    try {
      const tabs = await getMyFlowcharts();
      setFlowchartTabs(tabs.slice(0, maxFlowchartTabs));
      return tabs.slice(0, maxFlowchartTabs);
    } catch (e) {
      console.error('Failed to load flowchart tabs:', e);
      setFlowchartTabs([]);
      return [];
    }
  };

  const persistActiveFlowchartId = (flowchartId: number | null) => {
    if (!activeFlowchartStorageKey) return;
    if (flowchartId === null) {
      localStorage.removeItem(activeFlowchartStorageKey);
      return;
    }
    localStorage.setItem(activeFlowchartStorageKey, String(flowchartId));
  };

  const reloadFlowchart = async (failMessage: string, requestedFlowchartId?: number | null) => {
    try {
      const fc =
        readOnlyMode && targetStudentId !== null
          ? await getFlowchartByUserId(targetStudentId)
          : requestedFlowchartId !== null && requestedFlowchartId !== undefined
            ? await getMyFlowchartById(requestedFlowchartId)
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

  const loadReviewAndChecklist = async (flowchartId: number) => {
    setReviewLoading(true);
    setRequiredChangesLoading(true);
    setReviewError(null);
    setRequiredChangesError(null);
    try {
      const [reviewData, checklistData] = await Promise.all([
        getFlowchartReview(flowchartId),
        getFlowchartRequiredChanges(flowchartId),
      ]);
      setFlowchartReview(reviewData);
      setReviewNotesDraft(reviewData.reviewNotes ?? '');
      setRequiredChanges(checklistData);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load advisor review data.';
      setReviewError(message);
      setRequiredChangesError(message);
      setFlowchartReview(null);
      setRequiredChanges([]);
    } finally {
      setReviewLoading(false);
      setRequiredChangesLoading(false);
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
      const created = await createFlowchartComment(flowchart.id, {
        body,
        parentCommentId: replyParentCommentId,
        noteX: null,
        noteY: null,
      });
      setComments((current) => [...current, created]);
      setCommentDraft('');
      setReplyParentCommentId(null);
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

  const handleReviewStatusUpdate = async (status: FlowchartReviewStatus) => {
    if (!flowchart) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const updated = await updateFlowchartReview(flowchart.id, {
        status,
        reviewNotes: reviewNotesDraft.trim() || null,
      });
      setFlowchartReview(updated);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update review status.';
      setReviewError(message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSaveReviewNotes = async () => {
    if (!flowchart || !flowchartReview) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const updated = await updateFlowchartReview(flowchart.id, {
        status: flowchartReview.status,
        reviewNotes: reviewNotesDraft.trim() || null,
      });
      setFlowchartReview(updated);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to save review notes.';
      setReviewError(message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCreateRequiredChange = async () => {
    if (!flowchart) return;
    const label = requiredChangeDraft.trim();
    if (!label) {
      setRequiredChangesError('Checklist item text cannot be empty.');
      return;
    }
    setRequiredChangesError(null);
    setRequiredChangesLoading(true);
    try {
      const created = await createFlowchartRequiredChange(flowchart.id, { label });
      setRequiredChanges((current) => [...current, created]);
      setRequiredChangeDraft('');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to create checklist item.';
      setRequiredChangesError(message);
    } finally {
      setRequiredChangesLoading(false);
    }
  };

  const handleToggleRequiredChange = async (item: FlowchartRequiredChange, completed: boolean) => {
    setRequiredChangeActionLoadingId(item.id);
    setRequiredChangesError(null);
    try {
      const updated = await updateFlowchartRequiredChange(item.id, { completed });
      setRequiredChanges((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update checklist item.';
      setRequiredChangesError(message);
    } finally {
      setRequiredChangeActionLoadingId(null);
    }
  };

  const handleDeleteRequiredChange = async (itemId: number) => {
    setRequiredChangeActionLoadingId(itemId);
    setRequiredChangesError(null);
    try {
      await deleteFlowchartRequiredChange(itemId);
      setRequiredChanges((current) => current.filter((entry) => entry.id !== itemId));
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete checklist item.';
      setRequiredChangesError(message);
    } finally {
      setRequiredChangeActionLoadingId(null);
    }
  };

  // Load saved flowchart when dashboard loads
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      if (readOnlyMode) {
        await reloadFlowchart('Failed to load selected student flowchart. Please refresh and try again.');
        setLoading(false);
        return;
      }

      const tabs = await reloadFlowchartTabs();
      if (tabs.length === 0) {
        setFlowchart(null);
        setActiveFlowchartId(null);
        persistActiveFlowchartId(null);
        setLoading(false);
        return;
      }

      const persisted = activeFlowchartStorageKey ? Number(localStorage.getItem(activeFlowchartStorageKey)) : NaN;
      const validPersisted = Number.isFinite(persisted) && tabs.some((tab) => tab.id === persisted);
      const initialActiveId = validPersisted ? persisted : tabs[0].id;
      setActiveFlowchartId(initialActiveId);
      persistActiveFlowchartId(initialActiveId);
      await reloadFlowchart('Failed to load your flowchart. Please refresh and try again.', initialActiveId);
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
      setFlowchartReview(null);
      setRequiredChanges([]);
      setReplyParentCommentId(null);
      return;
    }
    void loadComments(flowchart.id);
    void loadReviewAndChecklist(flowchart.id);
  }, [flowchart?.id]);

  // After import completes, reload flowchart from backend
  const handleImportComplete = async () => {
    if (readOnlyMode) return;
    setLoading(true);
    setError(null);
    const tabs = await reloadFlowchartTabs();
    const nextActiveId = tabs.length > 0 ? tabs[0].id : null;
    setActiveFlowchartId(nextActiveId);
    persistActiveFlowchartId(nextActiveId);
    if (nextActiveId !== null) {
      await reloadFlowchart('Import succeeded, but loading the flowchart failed. Please refresh.', nextActiveId);
    } else {
      setFlowchart(null);
    }
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
      await deleteFlowchart(flowchart.id);
      const tabs = await reloadFlowchartTabs();
      const nextActiveId = tabs.length > 0 ? tabs[0].id : null;
      setActiveFlowchartId(nextActiveId);
      persistActiveFlowchartId(nextActiveId);
      if (nextActiveId !== null) {
        await reloadFlowchart('Flowchart was deleted, but loading the next flowchart failed.', nextActiveId);
      } else {
        setFlowchart(null);
      }
    } catch (err) {
      console.error('Failed to delete flowchart:', err);
    }
  };

  const handleSelectFlowchartTab = async (flowchartId: number) => {
    if (readOnlyMode || flowchartId === activeFlowchartId) return;
    setLoading(true);
    setError(null);
    setActiveFlowchartId(flowchartId);
    persistActiveFlowchartId(flowchartId);
    await reloadFlowchart('Failed to load selected flowchart. Please try again.', flowchartId);
    setLoading(false);
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
      <div className="flex h-full w-full gap-4 overflow-hidden px-4 pb-4 pt-24">
        <div className="w-[320px] shrink-0 overflow-y-auto pr-1">
          {readOnlyMode ? (
            <div className="p-2 w-full">
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
              <div className="p-2 w-full">
                <ImportProgressReport onImported={handleImportComplete} disabled={!canCreateMoreFlowcharts} />
                <div className="mt-2 text-xs text-slate-500">
                  {canCreateMoreFlowcharts
                    ? `${flowchartTabs.length}/${maxFlowchartTabs} flowcharts used. Uploading a report creates a new tab.`
                    : `You have reached the ${maxFlowchartTabs} flowchart limit.`}
                </div>
              </div>
              <div className="p-2 w-full">
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
          <div className="p-2 w-full">
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
          <div className="p-2 w-full">
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
              <div className="p-2 w-full space-y-3">
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
              <div className="p-2 w-full">
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
          {!readOnlyMode && flowchartTabs.length > 0 && (
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              {flowchartTabs.map((tab, index) => {
                const isActive = tab.id === activeFlowchartId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => void handleSelectFlowchartTab(tab.id)}
                    className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50'
                    }`}
                    title={tab.title}
                  >
                    {`Flowchart ${index + 1}`}
                  </button>
                );
              })}
            </div>
          )}
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

                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Advisor Review</div>
                        <span
                          className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                            reviewStatusStyles[flowchartReview?.status ?? 'PENDING']
                          }`}
                        >
                          {(flowchartReview?.status ?? 'PENDING').toLowerCase()}
                        </span>
                      </div>
                      <textarea
                        className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
                        rows={2}
                        placeholder="Review notes for this plan..."
                        value={reviewNotesDraft}
                        onChange={(e) => setReviewNotesDraft(e.target.value)}
                        disabled={reviewLoading}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {canReviewFlowchart && (
                          <>
                            <Button
                              size="small"
                              label="Approve"
                              onClick={() => void handleReviewStatusUpdate('APPROVED')}
                              disabled={reviewLoading || !flowchart}
                            />
                            <Button
                              size="small"
                              severity="danger"
                              outlined
                              label="Reject"
                              onClick={() => void handleReviewStatusUpdate('REJECTED')}
                              disabled={reviewLoading || !flowchart}
                            />
                          </>
                        )}
                        <Button
                          size="small"
                          text
                          label="Save Notes"
                          onClick={() => void handleSaveReviewNotes()}
                          disabled={reviewLoading || !flowchartReview}
                        />
                      </div>
                      {reviewError && <div className="mt-2 text-xs text-red-600">{reviewError}</div>}
                    </div>

                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Required Changes Checklist
                      </div>
                      {canReviewFlowchart && (
                        <div className="mt-2 flex gap-2">
                          <input
                            className="w-full rounded-md border border-slate-300 p-2 text-sm"
                            placeholder="Add required change item..."
                            value={requiredChangeDraft}
                            onChange={(e) => setRequiredChangeDraft(e.target.value)}
                            disabled={requiredChangesLoading}
                          />
                          <Button
                            size="small"
                            label="Add"
                            onClick={() => void handleCreateRequiredChange()}
                            disabled={requiredChangesLoading || !flowchart}
                          />
                        </div>
                      )}
                      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                        {requiredChangesLoading ? (
                          <div className="text-sm text-slate-600">Loading checklist...</div>
                        ) : requiredChanges.length === 0 ? (
                          <div className="text-sm text-slate-600">No required changes listed.</div>
                        ) : (
                          requiredChanges.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1">
                              <label className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={(e) => void handleToggleRequiredChange(item, e.target.checked)}
                                  disabled={requiredChangeActionLoadingId === item.id}
                                />
                                <span className={`${item.completed ? 'line-through text-slate-500' : ''}`}>{item.label}</span>
                              </label>
                              {canReviewFlowchart && (
                                <Button
                                  size="small"
                                  text
                                  severity="danger"
                                  label="Delete"
                                  onClick={() => void handleDeleteRequiredChange(item.id)}
                                  disabled={requiredChangeActionLoadingId === item.id}
                                />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      {requiredChangesError && <div className="mt-2 text-xs text-red-600">{requiredChangesError}</div>}
                    </div>

                    <div className="mt-3 space-y-2">
                      {replyParentCommentId !== null && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-800">
                          Replying to comment #{replyParentCommentId}
                          <button
                            type="button"
                            className="ml-2 text-blue-700 underline"
                            onClick={() => setReplyParentCommentId(null)}
                          >
                            cancel
                          </button>
                        </div>
                      )}
                      <textarea
                        className="w-full rounded-md border border-slate-300 p-2 text-sm"
                        rows={3}
                        placeholder={replyParentCommentId ? 'Write a reply...' : 'Add a recommendation or planning note...'}
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        disabled={commentSubmitting}
                      />
                      <Button
                        className="w-full"
                        label={commentSubmitting ? 'Posting...' : (replyParentCommentId ? 'Post Reply' : 'Post Note')}
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
                              style={{ marginLeft: `${(commentDepthMap.get(comment.id) ?? 0) * 12}px` }}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-slate-800">{comment.authorName}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {normalizeRole(comment.authorRole) || 'USER'}
                                    {comment.updatedAt ? ` - ${formatCommentDate(comment.updatedAt)}` : ''}
                                  </div>
                                  {comment.parentCommentId && (
                                    <div className="text-[11px] text-slate-500">Reply to #{comment.parentCommentId}</div>
                                  )}
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
                                      label="Reply"
                                      text
                                      onClick={() => setReplyParentCommentId(comment.id)}
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
