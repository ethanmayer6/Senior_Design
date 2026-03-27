import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axiosClient';
import {
  createCourseReview,
  deleteMyCourseReview,
  getCourseReviewSummary,
  getCourseReviews,
  getMyCourseReview,
  searchCoursesForReviews,
  updateMyCourseReview,
} from './courseReviewsApi';

vi.mock('./axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('courseReviewsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches courses and loads review pages and summaries', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: [{ id: 7, courseIdent: 'COMS_2270' }] })
      .mockResolvedValueOnce({ data: { averageRating: 4.5, reviewCount: 2 } })
      .mockResolvedValueOnce({ data: { reviews: [], totalElements: 0 } });

    expect(await searchCoursesForReviews('COMS')).toEqual([{ id: 7, courseIdent: 'COMS_2270' }]);
    expect(await getCourseReviewSummary(7)).toEqual({ averageRating: 4.5, reviewCount: 2 });
    expect(await getCourseReviews(7, { page: 1, size: 5 })).toEqual({ reviews: [], totalElements: 0 });
  });

  it('returns null for missing personal reviews and supports CRUD operations', async () => {
    mockedApi.get.mockResolvedValueOnce({ status: 204, data: null });
    mockedApi.post.mockResolvedValueOnce({ data: { id: 9, rating: 5 } });
    mockedApi.put.mockResolvedValueOnce({ data: { id: 9, rating: 4 } });
    mockedApi.delete.mockResolvedValueOnce({ data: null });

    expect(await getMyCourseReview(7)).toBeNull();
    expect(await createCourseReview(7, { rating: 5 })).toEqual({ id: 9, rating: 5 });
    expect(await updateMyCourseReview(7, { rating: 4 })).toEqual({ id: 9, rating: 4 });
    await deleteMyCourseReview(7);

    expect(mockedApi.delete).toHaveBeenCalledWith('/courses/7/reviews/me');
  });
});
