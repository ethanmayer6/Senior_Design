import api from './axiosClient';

export type StudentSearchResult = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  displayName?: string | null;
  major: string | null;
  email?: string | null;
  phone?: string | null;
  profileHeadline?: string | null;
  bio?: string | null;
  accentColor?: string | null;
  profilePictureUrl?: string | null;
  selectedBadgeCourseIdent?: string | null;
};

export async function searchUsersByUsername(username: string): Promise<StudentSearchResult[]> {
  const res = await api.get<StudentSearchResult[]>('/users/search', {
    params: { username },
  });
  return res.data;
}

export async function getFriends(): Promise<StudentSearchResult[]> {
  const res = await api.get<StudentSearchResult[]>('/users/friends');
  return res.data;
}

export async function addFriend(friendId: number): Promise<void> {
  await api.post(`/users/friends/${friendId}`);
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
