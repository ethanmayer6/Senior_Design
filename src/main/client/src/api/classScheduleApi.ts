import api from './axiosClient';
import type { Course } from './flowchartApi';

export interface ClassScheduleEntry {
  id: number;
  courseIdent: string;
  sectionCode: string;
  courseTitle: string;
  academicPeriodLabel: string;
  year: number;
  term: string;
  termStartDate: string | null;
  termEndDate: string | null;
  meetingPatternRaw: string | null;
  meetingDays: string | null;
  meetingStartTime: string | null;
  meetingEndTime: string | null;
  freeDropDeadline: string | null;
  withdrawDeadline: string | null;
  instructor: string | null;
  deliveryMode: string | null;
  locations: string | null;
  instructionalFormat: string | null;
  credits: number | null;
  catalogName: string | null;
  entryType: 'IMPORTED_CLASS' | 'CUSTOM_EVENT' | null;
  customEventTitle: string | null;
  customEventDate: string | null;
  customEventNotes: string | null;
}

export interface ClassScheduleImportResult {
  parsedRows: number;
  importedRows: number;
  linkedCatalogCourses: number;
  distinctCoursesSynced: number;
  touchedSemesters: number;
  message: string;
}

export interface CustomScheduleEventRequest {
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  notes?: string | null;
}

export async function importClassSchedule(file: File): Promise<ClassScheduleImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ClassScheduleImportResult>('/class-schedule/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getCurrentClassSchedule(): Promise<ClassScheduleEntry[]> {
  const res = await api.get<ClassScheduleEntry[]>('/class-schedule/current');
  return res.data ?? [];
}

export async function createCustomScheduleEvent(
  payload: CustomScheduleEventRequest
): Promise<ClassScheduleEntry> {
  const res = await api.post<ClassScheduleEntry>('/class-schedule/events', payload);
  return res.data;
}

export async function deleteCustomScheduleEvent(entryId: number): Promise<void> {
  await api.delete(`/class-schedule/events/${entryId}`);
}

export async function getCourseByIdent(courseIdent: string): Promise<Course | null> {
  if (!courseIdent) return null;
  try {
    const res = await api.get<Course>(`/courses/courseIdent/${encodeURIComponent(courseIdent)}`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}
