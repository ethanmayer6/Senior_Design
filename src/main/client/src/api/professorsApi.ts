import api from './axiosClient';

export type ProfessorExternalRating = {
  sourceSystem: string;
  sourceLabel: string;
  externalId: string | null;
  sourceUrl: string | null;
  averageRating: number | null;
  reviewCount: number | null;
  difficultyRating: number | null;
  wouldTakeAgainPercent: number | null;
  capturedAt: string | null;
  updatedAt: string | null;
};

export type ProfessorSummary = {
  id: number;
  fullName: string;
  title: string | null;
  department: string | null;
  email: string | null;
  profileUrl: string | null;
  averageRating: number;
  reviewCount: number;
  primaryExternalRating: ProfessorExternalRating | null;
};

export type ProfessorBrowseResponse = {
  professors: ProfessorSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string;
};

export type ProfessorDirectoryStatus = {
  ready: boolean;
  seeding: boolean;
  professorCount: number;
};

export type ProfessorReview = {
  id: number;
  rating: number;
  difficultyRating: number | null;
  workloadRating: number | null;
  wouldTakeAgain: boolean | null;
  classTaken: string | null;
  periodTaken: string | null;
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

export type ProfessorReviewPageResponse = {
  reviews: ProfessorReview[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ProfessorDetail = {
  id: number;
  fullName: string;
  title: string | null;
  department: string | null;
  email: string | null;
  profileUrl: string | null;
  bio: string | null;
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: Record<string, number>;
  externalRatings: ProfessorExternalRating[];
  myReview: ProfessorReview | null;
  currentUserCanReview: boolean;
};

export type ProfessorReviewRequest = {
  rating?: number | null;
  difficultyRating?: number | null;
  workloadRating?: number | null;
  wouldTakeAgain?: boolean | null;
  classTaken?: string | null;
  periodTaken?: string | null;
  gradeReceived?: string | null;
  positives?: string | null;
  negatives?: string | null;
  wouldLikeToSee?: string | null;
  studyTips?: string | null;
  anonymous?: boolean | null;
};

export async function browseProfessors(params?: {
  query?: string;
  department?: string;
  page?: number;
  size?: number;
  sort?: 'name' | 'rating';
}): Promise<ProfessorBrowseResponse> {
  const res = await api.get<ProfessorBrowseResponse>('/professors', { params });
  return res.data;
}

export async function getProfessorDirectoryStatus(): Promise<ProfessorDirectoryStatus> {
  const res = await api.get<ProfessorDirectoryStatus>('/professors/status');
  return res.data;
}

export async function getProfessorDepartments(): Promise<string[]> {
  const res = await api.get<string[]>('/professors/departments');
  return res.data;
}

export async function getProfessorDetail(professorId: number): Promise<ProfessorDetail> {
  const res = await api.get<ProfessorDetail>(`/professors/${professorId}`);
  return res.data;
}

export async function getProfessorReviews(
  professorId: number,
  params?: { page?: number; size?: number }
): Promise<ProfessorReviewPageResponse> {
  const res = await api.get<ProfessorReviewPageResponse>(`/professors/${professorId}/reviews`, { params });
  return res.data;
}

export async function getMyProfessorReview(professorId: number): Promise<ProfessorReview | null> {
  const res = await api.get<ProfessorReview>(`/professors/${professorId}/reviews/me`, {
    validateStatus: (status) => (status >= 200 && status < 300) || status === 204,
  });
  if (res.status === 204) {
    return null;
  }
  return res.data;
}

export async function createProfessorReview(
  professorId: number,
  payload: ProfessorReviewRequest
): Promise<ProfessorReview> {
  const res = await api.post<ProfessorReview>(`/professors/${professorId}/reviews`, payload);
  return res.data;
}

export async function updateMyProfessorReview(
  professorId: number,
  payload: ProfessorReviewRequest
): Promise<ProfessorReview> {
  const res = await api.put<ProfessorReview>(`/professors/${professorId}/reviews/me`, payload);
  return res.data;
}

export async function deleteMyProfessorReview(professorId: number): Promise<void> {
  await api.delete(`/professors/${professorId}/reviews/me`);
}

export async function saveRateMyProfessorsLink(
  professorId: number,
  sourceUrl: string
): Promise<ProfessorExternalRating> {
  const res = await api.put<ProfessorExternalRating>(
    `/professors/${professorId}/rate-my-professors-link`,
    { sourceUrl }
  );
  return res.data;
}
