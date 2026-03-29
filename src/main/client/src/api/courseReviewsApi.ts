import api from './axiosClient';

export type CourseSummary = {
  id: number;
  name: string;
  courseIdent: string;
  credits: number;
  description: string;
  offered: string | null;
  hours: string | null;
  prereq_txt: string | null;
  prerequisites: string[];
};

export type CourseBrowsePageResponse = {
  courses: CourseSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CourseReview = {
  id: number;
  rating: number;
  difficultyRating: number | null;
  workloadRating: number | null;
  wouldTakeAgain: boolean | null;
  semesterTaken: string | null;
  instructorName: string | null;
  gradeReceived: string | null;
  positives: string | null;
  negatives: string | null;
  wouldLikeToSee: string | null;
  studyTips: string | null;
  anonymous: boolean;
  reviewerId: number | null;
  reviewerDisplayName: string;
  createdAt: string;
  updatedAt: string;
  editableByCurrentUser: boolean;
};

export type CourseReviewPageResponse = {
  reviews: CourseReview[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CourseReviewSummary = {
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: Record<string, number>;
  myReview: CourseReview | null;
  currentUserCanReview: boolean;
};

export type CourseReviewRequest = {
  rating?: number | null;
  difficultyRating?: number | null;
  workloadRating?: number | null;
  wouldTakeAgain?: boolean | null;
  semesterTaken?: string | null;
  instructorName?: string | null;
  gradeReceived?: string | null;
  positives?: string | null;
  negatives?: string | null;
  wouldLikeToSee?: string | null;
  studyTips?: string | null;
  anonymous?: boolean | null;
};

export async function searchCoursesForReviews(searchTerm: string): Promise<CourseSummary[]> {
  const res = await api.get<CourseSummary[]>('/courses/search', {
    params: { searchTerm },
  });
  return res.data ?? [];
}

export async function getCoursesBrowsePage(params?: {
  page?: number;
  size?: number;
}): Promise<CourseBrowsePageResponse> {
  const res = await api.get<CourseBrowsePageResponse>('/courses/browse', { params });
  return res.data;
}

export async function getCourseReviewSummary(courseId: number): Promise<CourseReviewSummary> {
  const res = await api.get<CourseReviewSummary>(`/courses/${courseId}/reviews/summary`);
  return res.data;
}

export async function getCourseReviews(
  courseId: number,
  params?: { page?: number; size?: number }
): Promise<CourseReviewPageResponse> {
  const res = await api.get<CourseReviewPageResponse>(`/courses/${courseId}/reviews`, { params });
  return res.data;
}

export async function getMyCourseReview(courseId: number): Promise<CourseReview | null> {
  const res = await api.get<CourseReview>(`/courses/${courseId}/reviews/me`, {
    validateStatus: (status) => (status >= 200 && status < 300) || status === 204,
  });
  if (res.status === 204) {
    return null;
  }
  return res.data;
}

export async function createCourseReview(
  courseId: number,
  payload: CourseReviewRequest
): Promise<CourseReview> {
  const res = await api.post<CourseReview>(`/courses/${courseId}/reviews`, payload);
  return res.data;
}

export async function updateMyCourseReview(
  courseId: number,
  payload: CourseReviewRequest
): Promise<CourseReview> {
  const res = await api.put<CourseReview>(`/courses/${courseId}/reviews/me`, payload);
  return res.data;
}

export async function deleteMyCourseReview(courseId: number): Promise<void> {
  await api.delete(`/courses/${courseId}/reviews/me`);
}
