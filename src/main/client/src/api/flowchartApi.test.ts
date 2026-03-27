import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axiosClient';
import {
  dismissFlowchartComment,
  getFlowchartComments,
  getFlowchartRequirementCoverageByUserId,
  getUserFlowchart,
  updateFlowchartCourse,
} from './flowchartApi';

vi.mock('./axiosClient', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

describe('flowchartApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when user flowcharts or requirement coverage are missing', async () => {
    mockedApi.get.mockRejectedValueOnce({ response: { status: 404 } }).mockRejectedValueOnce({ response: { status: 404 } });

    expect(await getUserFlowchart()).toBeNull();
    expect(await getFlowchartRequirementCoverageByUserId(7)).toBeNull();
  });

  it('patches flowchart course updates and dismiss actions', async () => {
    mockedApi.patch
      .mockResolvedValueOnce({ data: { id: 9, title: 'Plan A' } })
      .mockResolvedValueOnce({ data: { id: 33, dismissed: true } });

    expect(await updateFlowchartCourse(9, { courseIdent: 'COMS_2270', status: 'COMPLETED', operation: 'UPDATE' }))
      .toEqual({ id: 9, title: 'Plan A' });
    expect(await dismissFlowchartComment(33, true)).toEqual({ id: 33, dismissed: true });

    expect(mockedApi.patch).toHaveBeenNthCalledWith(1, '/flowchart/update/9/course', {
      courseIdent: 'COMS_2270',
      status: 'COMPLETED',
      operation: 'UPDATE',
    });
    expect(mockedApi.patch).toHaveBeenNthCalledWith(2, '/flowchart/comments/33/dismiss', { dismissed: true });
  });

  it('returns an empty comment list when the endpoint responds with no array body', async () => {
    mockedApi.get.mockResolvedValue({ data: undefined });

    expect(await getFlowchartComments(7)).toEqual([]);
  });
});
