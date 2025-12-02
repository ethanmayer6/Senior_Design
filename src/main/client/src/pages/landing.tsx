import { Link } from "react-router-dom";
import Header from "../components/header";

export default function Landing(){
    return (
        <div className="min-h-screen bg-gray-100">
            <Header />

            <main className="pt-24 flex items-center justify-center min-h-[calc(100vh-5rem)]">
                <div className="w-full max-w-4xl px-6">
                    <div className="bg-white shadow-md rounded-lg p-8 flex flex-col md:flex-row items-center gap-8">
                        {/* Left */}
                        <div className="flex-shrink-0 flex items-center justify-center w-full md:w-1/3">
                            <img src="/logo.png" alt="CourseFlow Logo" className="w-48 h-auto" />
                        </div>
                        {/* Right */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-extrabold text-gray-800 mb-4">Welcome to CourseFlow!</h1>
                            <p className="text-gray-700 mb-4 leading-relaxed">
                                CourseFlow is a full-stack web application designed to simplify the process of planning a path to graduation for students and academic advisors.
                                At Iowa State, students and advisors currently verify degree progress by manually comparing PDF flowcharts with the classes taken or through Workday’s limited degree progress table.
                                This process is slow, prone to error, and stressful for students planning their coursework. CourseFlow addresses this problem by providing an interactive platform that makes planning, checking, and reviewing degree progress easy and engaging.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                <Link to="/login" className="inline-block w-full sm:w-auto">
                                    <button className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold">
                                        Login
                                    </button>
                                </Link>

                                <Link to="/register" className="inline-block w-full sm:w-auto">
                                    <button className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold">
                                        Sign Up
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}