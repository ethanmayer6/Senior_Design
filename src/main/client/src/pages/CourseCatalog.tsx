import {CourseCard} from "../components/CourseCard";
import type {Course} from "../types/course";
import axios from "axios";
import {useEffect, useState} from "react";
import {Button} from "primereact/button";
import {InputText} from "primereact/inputtext";
import {Panel} from "primereact/panel"

export default function CourseCatalog() {
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
        <div className="min-h-screen p-4 flex gap-4">
            <aside className="w-1/4">
                <Panel header="Filters" className="h-full">
                    <h1>College</h1> {/* COMS, SE */}
                    <h1>Class Number</h1> {/* 100 Level, 200 Level */}
                    <h1></h1> {/* COMS, SE */}
                </Panel>
            </aside>

            <main className="flex-1 flex flex-col gap-4">
                <div className="flex flex-row gap-4">
                    <InputText placeholder="Search" className="w-full bg-gray-700 border border-gray-700"/>
                    <Button icon="pi pi-sort-alt"/>
                </div>
                <div className="flex flex-col gap-4 w-full">
                    {courses.map((course) => (
                        <div key={course.courseIdent} className="w-full">
                            <CourseCard course={course}/>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};


// <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
//     {courses.map((course) => (
//         <CourseCard key={course.courseIdent} course={course} />
//     ))}
            // </div>
