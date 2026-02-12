import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "primereact/button";
import { Badge } from "../components/Badge";
import type { Course } from "../types/course";

const PAGE_SIZE = 72;

export default function CourseBadges() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [pageNumber, setPageNumber] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const getCourses = async (page: number, size: number = PAGE_SIZE): Promise<void> => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8080/api/courses/page", {
        params: { page, size },
      });

      const pageResults: Course[] = response.data;

      if (page === 0) {
        setCourses(pageResults);
      } else {
        setCourses((prev) => [...prev, ...pageResults]);
      }

      setPageNumber(page);
      setHasMore(pageResults.length === size);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCourses(0);
  }, []);

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center">
        {courses.map((course) => (
          <Badge key={course.courseIdent} course={course} size={128} />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        {hasMore && (
          <Button
            label={loading ? "Loading..." : "Load more"}
            onClick={() => getCourses(pageNumber + 1)}
            disabled={loading}
            className="p-button-outlined"
          />
        )}
      </div>
    </div>
  );
}
