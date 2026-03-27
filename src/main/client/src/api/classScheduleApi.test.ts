import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axiosClient';
import { getCourseByIdent, getCurrentClassSchedule, importClassSchedule } from './classScheduleApi';

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

describe('classScheduleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads schedule imports using form data', async () => {
    const file = new File(['content'], 'schedule.xlsx');
    mockedApi.post.mockResolvedValue({ data: { parsedRows: 2, importedRows: 2 } });

    const result = await importClassSchedule(file);

    expect(result).toEqual({ parsedRows: 2, importedRows: 2 });
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/class-schedule/import',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  });

  it('returns an empty schedule list when no data is present', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: undefined });

    expect(await getCurrentClassSchedule()).toEqual([]);
  });

  it('returns null for missing catalog courses and rethrows other errors', async () => {
    mockedApi.get.mockRejectedValueOnce({ response: { status: 404 } });
    mockedApi.get.mockRejectedValueOnce(new Error('boom'));

    expect(await getCourseByIdent('COMS_2270')).toBeNull();
    await expect(getCourseByIdent('COMS_2280')).rejects.toThrow('boom');
  });
});
