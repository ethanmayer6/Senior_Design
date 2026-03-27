import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axiosClient';
import { getDiningOverview } from './diningApi';

vi.mock('./axiosClient', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
};

describe('diningApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests dining overview with optional date filters', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { halls: [] } }).mockResolvedValueOnce({ data: { halls: [] } });

    await getDiningOverview();
    await getDiningOverview('2026-03-26');

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/dining', { params: undefined });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/dining', { params: { date: '2026-03-26' } });
  });
});
