import type { Course } from "./course";

export interface FlowchartResult {
  courses: Course[];
  edges: string[][]; // [ [src, tgt], ... ]
  completedCourses: string[];
  academicPeriods: Record<string, string | null>;
}
