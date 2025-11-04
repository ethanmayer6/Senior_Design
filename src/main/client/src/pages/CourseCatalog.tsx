import { CourseCard } from "../components/CourseCard";
import type { Course } from "../types/course";
import axios from "axios";
import {useEffect, useState} from "react";

export default function CourseCatalog() {
    const[courses, setCourses] = useState<Course[]>([]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {courses.map((course) => (
                <CourseCard key={course.courseIdent} course={course} />
            ))}
        </div>
    );
}
