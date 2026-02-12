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
