import api from './axiosClient';

export interface IsuDegreeImportResult {
  coursesCreated: number;
  coursesUpdated: number;
  majorsCreated: number;
  majorsUpdated: number;
  requirementsCreated: number;
  requirementGroupsCreated: number;
  warnings: string[];
}

export interface MajorCourse {
  id: number;
  courseIdent: string;
  name: string;
  credits: number;
}

export interface MajorRequirementGroup {
  id: number;
  name: string;
  satisfyingCredits: number;
  courses: MajorCourse[];
}

export interface MajorRequirement {
  id: number;
  name: string;
  satisfyingCredits: number;
  courses: MajorCourse[];
  requirementGroups: MajorRequirementGroup[];
}

export interface Major {
  id: number;
  name: string;
  college: string;
  description: string;
  degreeRequirements: MajorRequirement[];
}

export interface MajorSummary {
  id: number;
  name: string;
  college: string;
}

export async function getMajorNames(): Promise<string[]> {
  const res = await api.get<string[]>('/majors/names');
  return (res.data ?? []).filter((name): name is string => typeof name === 'string' && name.length > 0);
}

export async function getMajorByName(name: string): Promise<Major> {
  const res = await api.get<Major>(`/majors/name/${encodeURIComponent(name)}`);
  return res.data;
}

export async function getMajorById(id: number): Promise<Major> {
  const res = await api.get<Major>(`/majors/ident/${id}`);
  return res.data;
}

export async function getMajorSummaries(): Promise<MajorSummary[]> {
  const res = await api.get<MajorSummary[]>('/majors/summaries');
  return res.data ?? [];
}

export async function importIsuDatasetFromPublicFile(
  publicPath = '/isu-degree-dataset.json'
): Promise<IsuDegreeImportResult> {
  const response = await fetch(publicPath, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load dataset file (${response.status})`);
  }

  const blob = await response.blob();
  const file = new File([blob], 'isu-degree-dataset.json', { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<IsuDegreeImportResult>('/majors/isu/import/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data;
}

export async function importIsuMajorsFromPublicFile(
  publicPath = '/isu-degree-dataset.json'
): Promise<IsuDegreeImportResult> {
  const response = await fetch(publicPath, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load dataset file (${response.status})`);
  }

  const blob = await response.blob();
  const file = new File([blob], 'isu-degree-dataset.json', { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<IsuDegreeImportResult>('/majors/isu/import/majors/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data;
}

export async function importIsuCoursesFromPublicFile(
  publicPath = '/isu-degree-dataset.json'
): Promise<IsuDegreeImportResult> {
  const response = await fetch(publicPath, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load dataset file (${response.status})`);
  }

  const dataset = (await response.json()) as { courses?: unknown[] };
  const courseCount = Array.isArray(dataset?.courses) ? dataset.courses.length : 0;
  if (courseCount === 0) {
    throw new Error('Dataset has no courses. Regenerate with --include-courses, then import again.');
  }

  const blob = new Blob([JSON.stringify(dataset)], { type: 'application/json' });
  const file = new File([blob], 'isu-degree-dataset.json', { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<IsuDegreeImportResult>('/majors/isu/import/courses/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data;
}
