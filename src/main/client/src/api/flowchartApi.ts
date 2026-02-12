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
  prerequisites: string[];
  description: string;
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
