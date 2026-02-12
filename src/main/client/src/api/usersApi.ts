import api from './axiosClient';

export type StudentSearchResult = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  major: string;
};

export async function searchUsersByUsername(username: string): Promise<StudentSearchResult[]> {
  const res = await api.get<StudentSearchResult[]>('/users/search', {
    params: { username },
  });
  return res.data;
}

export type ThemePreset = 'default' | 'ocean' | 'forest';
export type FontScale = 'small' | 'medium' | 'large';

export type UserPreferences = {
  darkMode: boolean;
  themePreset: ThemePreset;
  fontScale: FontScale;
  reducedMotion: boolean;
};

export async function getUserPreferences(): Promise<UserPreferences> {
  const res = await api.get<UserPreferences>('/users/preferences');
  return res.data;
}

export async function updateUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  const res = await api.put<UserPreferences>('/users/preferences', prefs);
  return res.data;
}
