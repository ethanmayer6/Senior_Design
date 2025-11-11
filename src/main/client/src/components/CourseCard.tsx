import React from "react";
import type { Course } from "../types/course";
import { Card } from "primereact/card";
import { Badge } from "../components/Badge";

interface CourseCardProps {
  course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const formattedIdent = course.courseIdent.replace(/_/g, " ");

  return (
    // ✅ Grid auto-stretch will make these match height automatically
    <div className="relative overflow-visible flex flex-col h-full p-4">
      <Card className="shadow-sm border flex flex-col flex-1 h-full">
        <div className="flex flex-col gap-2 p-4 flex-grow">
          <h2 className="font-family">{formattedIdent}</h2>
          <p className="text-red-600 text-sm">{course.name}</p>

          <p className="text-gray-700 text-sm leading-relaxed flex-grow">
            {course.description}
          </p>

          <div className="text-xs text-gray-500 mt-2">
            Credits: {course.credits} • {course.hours}
          </div>

          <div className="text-xs text-primary-600">
            Offered: {course.offered}
          </div>
        </div>
      </Card>

      {/* ✅ Badge still hangs off the corner */}
      <div className="absolute -bottom-10 -right-10">
        <Badge key={course.courseIdent} course={course} size={120} />
      </div>
    </div>
  );
};

