import React from "react";
import type {Course} from "../types/course";
import {Card} from "primereact/card";
import {Button} from "primereact/button";

interface CourseCardProps {
    course: Course;
    onAddToFlowchart?: (course: Course) => void;
    onEditCourse?: (course: Course) => void;
    onDeleteCourse?: (course: Course) => void;
    addDisabled?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({
    course,
    onAddToFlowchart,
    onEditCourse,
    onDeleteCourse,
    addDisabled = false
}) => {
    const formattedIdent = course.courseIdent.replace(/_/g, " ");
    return (
        <Card className="shadow-sm border">
            <div className="flex flex-col gap-2">
                <h2 className="font-family">{formattedIdent}</h2>
                <p className="text-red-600 text-sm">{course.name}</p>
                <p className="text-gray-700 text-sm leading-relaxed">{course.description}</p>
                <div className="text-xs text-gray-500 mt-2">
                    Credits: {course.credits} | {course.hours}
                </div>
                <div className="text-xs text-primary-600">Offered: {course.offered}</div>
                {(onAddToFlowchart || onEditCourse || onDeleteCourse) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {onAddToFlowchart && (
                            <Button
                                label="Add to CourseFlow"
                                icon="pi pi-plus"
                                className="p-button-sm"
                                disabled={addDisabled}
                                onClick={() => onAddToFlowchart(course)}
                            />
                        )}
                        {onEditCourse && (
                            <Button
                                label="Edit Course"
                                icon="pi pi-pencil"
                                className="p-button-sm p-button-outlined"
                                onClick={() => onEditCourse(course)}
                            />
                        )}
                        {onDeleteCourse && (
                            <Button
                                label="Delete Course"
                                icon="pi pi-trash"
                                className="p-button-sm p-button-danger p-button-outlined"
                                onClick={() => onDeleteCourse(course)}
                            />
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};
