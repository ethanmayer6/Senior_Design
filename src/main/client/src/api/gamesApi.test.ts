import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axiosClient';
import { getDailyGame, submitDailyGuess } from './gamesApi';

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

describe('gamesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the daily game state', async () => {
    mockedApi.get.mockResolvedValue({ data: { puzzleDate: '2026-03-26', solved: false } });

    const state = await getDailyGame();

    expect(state.puzzleDate).toBe('2026-03-26');
    expect(mockedApi.get).toHaveBeenCalledWith('/games/daily');
  });

  it('submits a guess payload', async () => {
    mockedApi.post.mockResolvedValue({ data: { correct: true, message: 'Nice work' } });

    const result = await submitDailyGuess('logic');

    expect(result.correct).toBe(true);
    expect(mockedApi.post).toHaveBeenCalledWith('/games/daily/guess', { guess: 'logic' });
  });
});
