import api from './axiosClient';
import type { Course } from '../types/course';

export type CourseCatalogPageResponse = {
  courses: Course[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CourseCatalogFilterParams = {
  level?: string;
  offeredTerm?: string;
  department?: string;
  page?: number;
  size?: number;
};

export type CourseCatalogUpdateInput = {
  name?: string | null;
  ident?: string | null;
  credits?: number | null;
  prereq_txt?: string | null;
  description?: string | null;
  hours?: string | null;
  offered?: string | null;
  prereqIdents?: string[];
};

export async function getCourseCatalogBrowsePage(params?: {
  page?: number;
  size?: number;
}): Promise<CourseCatalogPageResponse> {
  const res = await api.get<CourseCatalogPageResponse>('/courses/browse', { params });
  return res.data;
}

export async function searchCourseCatalog(searchTerm: string): Promise<Course[]> {
  const res = await api.get<Course[]>('/courses/search', {
    params: { searchTerm },
  });
  return res.data ?? [];
}

export async function filterCourseCatalog(params: CourseCatalogFilterParams): Promise<Course[]> {
  const res = await api.get<Course[]>('/courses/filter', { params });
  return res.data ?? [];
}

export async function updateCatalogCourse(
  courseId: number,
  payload: CourseCatalogUpdateInput
): Promise<Course> {
  const res = await api.put<Course>(`/courses/update/${courseId}`, payload);
  return res.data;
}

export async function deleteCatalogCourse(courseId: number): Promise<void> {
  await api.delete(`/courses/delete/${courseId}`);
}
