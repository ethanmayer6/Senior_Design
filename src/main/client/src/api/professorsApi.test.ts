import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axiosClient';
import {
  browseProfessors,
  createProfessorReview,
  deleteMyProfessorReview,
  getMyProfessorReview,
  getProfessorDepartments,
  getProfessorDetail,
  getProfessorDirectoryStatus,
  getProfessorReviews,
  updateMyProfessorReview,
} from './professorsApi';

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

describe('professorsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads professor browse and detail data', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { professors: [{ id: 7, fullName: 'Dr. Ada' }] } })
      .mockResolvedValueOnce({ data: { ready: true, professorCount: 240 } })
      .mockResolvedValueOnce({ data: ['SE', 'COM S'] })
      .mockResolvedValueOnce({ data: { id: 7, fullName: 'Dr. Ada' } })
      .mockResolvedValueOnce({ data: { reviews: [], totalElements: 0 } });

    expect((await browseProfessors({ query: 'ada' })).professors[0].fullName).toBe('Dr. Ada');
    expect((await getProfessorDirectoryStatus()).ready).toBe(true);
    expect(await getProfessorDepartments()).toEqual(['SE', 'COM S']);
    expect((await getProfessorDetail(7)).id).toBe(7);
    expect((await getProfessorReviews(7, { page: 1 })).reviews).toEqual([]);
  });

  it('handles personal professor reviews and review mutations', async () => {
    mockedApi.get.mockResolvedValueOnce({ status: 204, data: null });
    mockedApi.post.mockResolvedValueOnce({ data: { id: 11, rating: 5 } });
    mockedApi.put.mockResolvedValueOnce({ data: { id: 11, rating: 4 } });
    mockedApi.delete.mockResolvedValueOnce({ data: null });

    expect(await getMyProfessorReview(7)).toBeNull();
    expect(await createProfessorReview(7, { rating: 5 })).toEqual({ id: 11, rating: 5 });
    expect(await updateMyProfessorReview(7, { rating: 4 })).toEqual({ id: 11, rating: 4 });
    await deleteMyProfessorReview(7);

    expect(mockedApi.delete).toHaveBeenCalledWith('/professors/7/reviews/me');
  });
});
