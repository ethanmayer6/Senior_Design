import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/Badge";
import type { Course } from "../types/course";
import { getUserFlowchart } from "../api/flowchartApi";
import { createStatusLookup, normalizeStatus, resolveCourseStatus } from "../utils/flowchartStatus";

export default function CourseBadges() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBadges = async () => {
      setLoading(true);
      setError(null);
      try {
        const flowchart = await getUserFlowchart();

        if (!flowchart) {
          setCourses([]);
          return;
        }
        const statusLookup = createStatusLookup(flowchart.courseStatusMap);
        const uniqueCompleted = new Map<string, Course>();

        (flowchart.semesters ?? []).forEach((semester) => {
          (semester.courses ?? []).forEach((course) => {
            const status = resolveCourseStatus(statusLookup, course.courseIdent);
            if (normalizeStatus(status) !== "COMPLETED") return;
            if (!course.courseIdent) return;
            if (!uniqueCompleted.has(course.courseIdent)) {
              uniqueCompleted.set(course.courseIdent, course as Course);
            }
          });
        });

        setCourses(Array.from(uniqueCompleted.values()));
      } catch (err) {
        console.error("Error loading badges:", err);
        setError("Failed to load badges. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
  }, []);

  const orderedCourses = useMemo(() => {
    const courseList = [...courses];
    courseList.sort((a, b) => a.courseIdent.localeCompare(b.courseIdent));
    return courseList;
  }, [courses]);

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-4 text-center text-sm text-slate-600">Loading badges...</div>
      )}
      {!loading && !error && orderedCourses.length === 0 && (
        <div className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          No completed course badges yet.
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center">
        {orderedCourses.map((course) => (
          <div
            key={course.courseIdent}
            className="flex w-full max-w-[180px] flex-col items-center rounded-lg border border-slate-200 bg-white px-2 py-3 shadow-sm"
          >
            <Badge course={course} size={128} />
            <div className="mt-2 text-center">
              <div className="text-xs font-semibold text-slate-800">{course.name}</div>
              <div className="text-[11px] text-slate-500">{course.courseIdent.replace("_", " ")}</div>
              <div className="mt-1 text-[11px] font-semibold text-emerald-700">Completed</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
