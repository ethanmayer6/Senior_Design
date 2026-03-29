import api from './axiosClient';
import type { Semester } from './flowchartApi';

export interface SemesterCreateRequest {
  year: number;
  term: string;
  major: string;
  flowchartId: number;
  courseIdents: string[];
}

export async function createSemester(payload: SemesterCreateRequest): Promise<Semester> {
  const res = await api.post<Semester>('/semester/create', payload);
  return res.data;
}
