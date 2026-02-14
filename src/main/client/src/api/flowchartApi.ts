// src/api/flowchartApi.ts

import api from "./axiosClient";

/**
 * We don't know the exact Java enum values for Status yet,
 * so keep this as a flexible string type.
 * You can tighten this later to the real enum names.
 */
export type CourseStatus = string; // e.g. "PLANNED" | "IN_PROGRESS" | "COMPLETED" | ...

// Keep in sync with your backend Course entity shape.
// This matches what you're already using in the Flowchart component.
export interface Course {
  id: number;
  name: string;
  courseIdent: string;
  credits: number;
  prereq_txt?: string;
  prerequisites: string[];
  description: string;
  hours?: string;
  offered: string;
}

export interface Semester {
  id: number;
  year: number;
  term: string; // Java Term enum serialized as string, e.g. "FALL", "SPRING"
  major: string;
  courses: Course[];
}

export interface Flowchart {
  id: number;
  totalCredits: number;
  creditsSatisfied: number;
  title: string;

  // The map<courseIdent, Status> on the backend
  courseStatusMap: Record<string, CourseStatus>;

  // We’ll get the major object back from JPA; keep it loose here
  major?: any;

  // JPA relation; this will be present unless you @JsonIgnore it
  semesters?: Semester[];
}

/**
 * Matches FlowchartDTO on the backend.
 * This is what you send on create/update.
 */
export interface FlowchartDTOInput {
  totalCredits: number;
  creditsSatisfied: number;
  title: string;
  userId: number;
  semesterIdents: number[];
  courseStatusMap: Record<string, CourseStatus>;
  majorName: string;
}

/**
 * Matches CourseMapRequest on the backend controller for
 * /update/{id}/course
 */
export interface CourseMapRequest {
  courseIdent: string;
  status: CourseStatus | null;
  operation: "ADD" | "UPDATE" | "REMOVE";
}

export interface SemesterCourseUpdateRequest {
  operation: "ADD" | "REMOVE";
  courseIdent: string;
}

export interface FlowchartInsights {
  completedCredits: number;
  inProgressCredits: number;
  appliedCredits: number;
  totalCredits: number;
  remainingCredits: number;
  inProgressCourseCount: number;
  unfulfilledCourseCount: number;
  estimatedTermsToGraduate: number;
  projectedGraduationTerm: string;
  riskFlags: string[];
}

export interface RequirementCoverageItem {
  name: string;
  requiredCredits: number;
  completedCredits: number;
  inProgressCredits: number;
  remainingCredits: number;
  status: "SATISFIED" | "IN_PROGRESS" | "UNMET" | string;
  completedCourses: string[];
  inProgressCourses: string[];
}

export interface FlowchartRequirementCoverage {
  totalRequirements: number;
  satisfiedRequirements: number;
  inProgressRequirements: number;
  unmetRequirements: number;
  requirements: RequirementCoverageItem[];
}

export interface FlowchartComment {
  id: number;
  flowchartId: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  body: string;
  noteX: number | null;
  noteY: number | null;
  dismissed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlowchartCommentInput {
  body: string;
  noteX?: number | null;
  noteY?: number | null;
}

export interface FlowchartTab {
  id: number;
  title: string;
  totalCredits: number;
  creditsSatisfied: number;
  semesterCount: number;
}

/**
 * Get the flowchart for the currently authenticated user.
 * Backend derives the user from the JWT, so no params needed.
 *
 * Returns null if the user has no flowchart yet (404).
 */
export async function getUserFlowchart(): Promise<Flowchart | null> {
  try {
    const res = await api.get<Flowchart>("/flowchart/user");
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getMyFlowcharts(): Promise<FlowchartTab[]> {
  const res = await api.get<FlowchartTab[]>('/flowchart/user/flowcharts');
  return res.data ?? [];
}

export async function getMyFlowchartById(flowchartId: number): Promise<Flowchart | null> {
  try {
    const res = await api.get<Flowchart>(`/flowchart/user/flowcharts/${flowchartId}`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Get the latest flowchart for a specific user id.
 * Intended for advisor/faculty/admin read-only views.
 */
export async function getFlowchartByUserId(userId: number): Promise<Flowchart | null> {
  try {
    const res = await api.get<Flowchart>(`/flowchart/user/${userId}`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Create a new flowchart using FlowchartDTO.
 * You’ll usually call this once for a new user.
 */
export async function createFlowchart(
  dto: FlowchartDTOInput
): Promise<Flowchart> {
  const res = await api.post<Flowchart>("/flowchart/create", dto);
  return res.data;
}

/**
 * Update an existing flowchart using FlowchartDTO fields.
 * You can send a partial DTO for convenience.
 */
export async function updateFlowchart(
  id: number,
  dto: Partial<FlowchartDTOInput>
): Promise<Flowchart> {
  const res = await api.put<Flowchart>(`/flowchart/update/${id}`, dto);
  return res.data;
}

/**
 * Update / add / remove a single course entry in courseStatusMap
 * using the PATCH /update/{id}/course endpoint.
 * operation: "ADD" | "UPDATE" | "REMOVE"
 */
export async function updateFlowchartCourse(
  flowchartId: number,
  payload: CourseMapRequest
): Promise<Flowchart> {
  const res = await api.patch<Flowchart>(
    `/flowchart/update/${flowchartId}/course`,
    payload
  );
  return res.data;
}

/**
 * Delete a flowchart by id.
 */
export async function deleteFlowchart(id: number): Promise<void> {
  await api.delete(`/flowchart/delete/${id}`);
}

/**
 * Get all flowcharts (admin / debug use).
 */
export async function getAllFlowcharts(): Promise<Flowchart[]> {
  const res = await api.get<Flowchart[]>("/flowchart/getall");
  return res.data;
}

/**
 * Get all courses in a flowchart that currently have a given Status.
 * Status must match the Java enum name in the URL.
 */
export async function getCoursesByStatus(
  flowchartId: number,
  status: CourseStatus
): Promise<Course[]> {
  const res = await api.get<Course[]>(
    `/flowchart/courses/${flowchartId}/${status}`
  );
  return res.data;
}

export async function updateSemesterCourses(
  semesterId: number,
  payload: SemesterCourseUpdateRequest
) {
  const res = await api.patch(`/semester/update/${semesterId}/courses`, payload);
  return res.data;
}

export async function getFlowchartInsights(): Promise<FlowchartInsights | null> {
  try {
    const res = await api.get<FlowchartInsights>("/flowchart/user/insights");
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getFlowchartInsightsByUserId(userId: number): Promise<FlowchartInsights | null> {
  try {
    const res = await api.get<FlowchartInsights>(`/flowchart/user/${userId}/insights`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getFlowchartInsightsByFlowchartId(flowchartId: number): Promise<FlowchartInsights | null> {
  try {
    const res = await api.get<FlowchartInsights>(`/flowchart/${flowchartId}/insights`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getFlowchartRequirementCoverage(): Promise<FlowchartRequirementCoverage | null> {
  try {
    const res = await api.get<FlowchartRequirementCoverage>("/flowchart/user/requirements/coverage");
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getFlowchartRequirementCoverageByUserId(
  userId: number
): Promise<FlowchartRequirementCoverage | null> {
  try {
    const res = await api.get<FlowchartRequirementCoverage>(`/flowchart/user/${userId}/requirements/coverage`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getFlowchartRequirementCoverageByFlowchartId(
  flowchartId: number
): Promise<FlowchartRequirementCoverage | null> {
  try {
    const res = await api.get<FlowchartRequirementCoverage>(`/flowchart/${flowchartId}/requirements/coverage`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getFlowchartComments(flowchartId: number): Promise<FlowchartComment[]> {
  const res = await api.get<FlowchartComment[]>(`/flowchart/${flowchartId}/comments`);
  return res.data ?? [];
}

export async function createFlowchartComment(
  flowchartId: number,
  payload: FlowchartCommentInput
): Promise<FlowchartComment> {
  const res = await api.post<FlowchartComment>(`/flowchart/${flowchartId}/comments`, payload);
  return res.data;
}

export async function updateFlowchartComment(commentId: number, payload: FlowchartCommentInput): Promise<FlowchartComment> {
  const res = await api.put<FlowchartComment>(`/flowchart/comments/${commentId}`, payload);
  return res.data;
}

export async function deleteFlowchartComment(commentId: number): Promise<void> {
  await api.delete(`/flowchart/comments/${commentId}`);
}

export async function dismissFlowchartComment(commentId: number, dismissed: boolean): Promise<FlowchartComment> {
  const res = await api.patch<FlowchartComment>(`/flowchart/comments/${commentId}/dismiss`, { dismissed });
  return res.data;
}
