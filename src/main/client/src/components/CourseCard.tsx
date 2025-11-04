import React from "react";
import type {Course} from "../types/course";
import {Card} from "primereact/card";

interface CourseCardProps {
    course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
    const formattedIdent = course.courseIdent.replace(/_/g, " ");
    return (
        <Card className="shadow-sm border">
            <div className="flex flex-col gap-2">
                <h2 className="font-family">{formattedIdent}</h2>
                <p className="text-red-600 text-sm">{course.name}</p>

                <p className="text-gray-700 text-sm leading-relaxed">{course.description}</p>

                <div className="text-xs text-gray-500 mt-2">
                    Credits: {course.credits} • {course.hours}
                </div>
                <div className="text-xs text-primary-600">Offered: {course.offered}</div>
            </div>
        </Card>
    );
}