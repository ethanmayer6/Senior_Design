import { useEffect, useState } from "react";
import axios from "axios";
import { Badge } from "../components/Badge";
import type { Course } from "../types/course";

export default function CourseBadges() {
  const [courses, setCourses] = useState<Course[]>([]);

  const getCourses = async (): Promise<void> => {
    try {
      const response = await axios.get("http://localhost:8080/api/courses/all");
      console.log(response.data);
      setCourses(response.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  useEffect(() => {
    getCourses();
  }, []);

  return (
    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center">
      {courses.map((course) => (
        <Badge key={course.courseIdent} course={course} size={128} />
      ))}
    </div>
  );
}
