import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axiosClient';
import {
  addFriend,
  getFriends,
  getUserPreferences,
  searchUsersByUsername,
  updateUserPreferences,
} from './usersApi';

vi.mock('./axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};

describe('usersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches users by username', async () => {
    mockedApi.get.mockResolvedValue({ data: [{ id: 7, username: 'ada' }] });

    const result = await searchUsersByUsername('ada');

    expect(result).toEqual([{ id: 7, username: 'ada' }]);
    expect(mockedApi.get).toHaveBeenCalledWith('/users/search', { params: { username: 'ada' } });
  });

  it('loads friends and preference data', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: [{ id: 8, username: 'grace' }] })
      .mockResolvedValueOnce({ data: { darkMode: true, themePreset: 'ocean', fontScale: 'large', reducedMotion: true } });

    expect(await getFriends()).toEqual([{ id: 8, username: 'grace' }]);
    expect(await getUserPreferences()).toEqual({
      darkMode: true,
      themePreset: 'ocean',
      fontScale: 'large',
      reducedMotion: true,
    });
  });

  it('adds friends and updates user preferences', async () => {
    mockedApi.post.mockResolvedValue({ data: null });
    mockedApi.put.mockResolvedValue({
      data: { darkMode: false, themePreset: 'forest', fontScale: 'small', reducedMotion: false },
    });

    await addFriend(22);
    const updated = await updateUserPreferences({
      darkMode: false,
      themePreset: 'forest',
      fontScale: 'small',
      reducedMotion: false,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/users/friends/22');
    expect(mockedApi.put).toHaveBeenCalledWith('/users/preferences', {
      darkMode: false,
      themePreset: 'forest',
      fontScale: 'small',
      reducedMotion: false,
    });
    expect(updated.themePreset).toBe('forest');
  });
});
