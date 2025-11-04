import {CourseCard} from "../components/CourseCard";
import type {Course} from "../types/course";
import axios from "axios";
import {useEffect, useState} from "react";
import {Button} from "primereact/button";
import {InputText} from "primereact/inputtext";
import {Panel} from "primereact/panel"
import {RadioButton} from "primereact/radiobutton";
// import { Slider } from 'primereact/slider';

export default function CourseCatalog() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [level, setLevel] = useState('');
    const [offeredTerm, setOfferedTerm] = useState('');
    const [department, setDepartment] = useState('');
    // const [credits, setCredits] = useState(0);


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

                    {/* Course Level */}
                    <div className="flex flex-col gap-3">
                        <h1 className="text-red-600 text-lg">Course Level</h1>
                        {['1000', '2000', '3000', '4000', '5000'].map((lvl) => (
                            <div key={lvl} className="flex items-center">
                                <RadioButton inputId={lvl} name="course-level" value={lvl}
                                             onChange={(e) => setLevel(e.value)} checked={level === lvl}/>
                                <label htmlFor={lvl} className="ml-2">{lvl} Level</label>
                            </div>
                        ))}
                    </div>

                    {/* Term Offered */}
                    <div className="flex flex-col gap-3 mt-3">
                        <h1 className="text-red-600 text-lg">Offered Term</h1>
                        {['Fall', 'Spring', 'Summer', 'Winter'].map((term) => (
                            <div key={term} className="flex items-center">
                                <RadioButton inputId={term} name="offered-term" value={term.toLowerCase()}
                                             onChange={(e) => setOfferedTerm(e.value)} checked={offeredTerm === term.toLowerCase()}/>
                                <label htmlFor={term} className="ml-2">{term}</label>
                            </div>
                        ))}
                    </div>

                    {/* Department / Prefix */}
                    <div className="flex flex-col gap-3 mt-3">
                        <h1 className="text-red-600 text-lg">Department</h1>
                        <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md bg-white text-gray-700"
                        >
                            <option value="">All Departments</option>
                            <option value="COMS">COMS</option>
                            <option value="SE">SE</option>
                            <option value="MATH">MATH</option>
                            <option value="CPRE">CPRE</option>
                            <option value="EE">EE</option>
                        </select>
                    </div>

                    {/* Credit Hours */}
                    {/*<div className="flex flex-col gap-3 mt-3">*/}
                    {/*    <h1 className="text-red-600 text-lg">Credit Hours</h1>*/}
                    {/*    <Slider value={credits} onChange={(e) => setCredits(e.value)} min={1} max={5} step={1} />*/}
                    {/*    <div className="text-sm text-gray-600 text-center">Credits: {credits}</div>*/}
                    {/*</div>*/}


                    {/* Apply / Reset Buttons */}
                    <div className="flex justify-between mt-4">
                        <Button label="Apply Filters" icon="pi pi-filter" className="p-button-sm" />
                        <Button label="Reset" icon="pi pi-refresh" className="p-button-text p-button-sm"
                                onClick={() => { setLevel(''); setOfferedTerm(''); setDepartment(''); }} />
                    </div>

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
