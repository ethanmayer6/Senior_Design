import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axiosClient';
import {
  getMajorNames,
  getMajorSummariesPage,
  importIsuCoursesFromPublicFile,
  retryIsuImportJob,
  startIsuImportJobFromServerDataset,
} from './majorsApi';

vi.mock('./axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('majorsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('filters empty major names and trims summary queries', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: ['Software Engineering', '', null, 'Computer Science'] })
      .mockResolvedValueOnce({ data: { content: [], totalElements: 0 } });

    expect(await getMajorNames()).toEqual(['Software Engineering', 'Computer Science']);
    await getMajorSummariesPage(2, 10, '  comp sci  ');

    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/majors/summaries/page', {
      params: { page: 2, size: 10, query: 'comp sci' },
    });
  });

  it('rejects course imports when the public dataset contains no course records', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ courses: [] }), { status: 200 }));

    await expect(importIsuCoursesFromPublicFile('/dataset.json')).rejects.toThrow(
      'Dataset has no courses. Regenerate with --include-courses, then import again.',
    );
  });

  it('starts and retries server-side import jobs', async () => {
    mockedApi.post
      .mockResolvedValueOnce({ data: { jobId: 'abc', status: 'RUNNING' } })
      .mockResolvedValueOnce({ data: { jobId: 'abc', status: 'RUNNING' } });

    expect(await startIsuImportJobFromServerDataset('MAJORS_ONLY', 'docs/isu-degree-dataset.json', 50)).toEqual({
      jobId: 'abc',
      status: 'RUNNING',
    });
    expect(await retryIsuImportJob('abc')).toEqual({ jobId: 'abc', status: 'RUNNING' });

    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/majors/isu/import/local/async', null, {
      params: { mode: 'MAJORS_ONLY', chunkSize: 50, path: 'docs/isu-degree-dataset.json' },
    });
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/majors/isu/import/jobs/abc/retry');
  });
});
