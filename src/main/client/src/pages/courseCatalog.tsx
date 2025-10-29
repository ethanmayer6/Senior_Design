import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import axios from "axios";

export default function CourseCatalog() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGetCourse = async () => {

    try {
      const response = await axios(
        "http://localhost:8080/api/courses",
      );
      console.log(response.data);

    } catch (err: any) {
      console.error("failed");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      {/* Logo Section */}
      <img
        src="/logo.png"
        alt="CourseFlow Logo"
        className="w-[200px] absolute top-2 left-2 object-contain"
      />

      {/* Login Card */}
      <Card className="w-[400px] bg-white shadow-md rounded-xl p-6 flex flex-col items-center">
        {/* Header Text */}
        <div className="text-center mb-5">
          <p className="text-gray-500 text-sm">Please enter your details</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">
            Welcome back
          </h2>
        </div>

        {/* Form */}
        <div className="flex flex-col w-[330px] gap-5 m-0">
          {/* Email */}
          <div className="flex flex-col">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-600 mb-1"
            >
              Email address
            </label>
            <InputText
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-600 mb-1"
            >
              Password
            </label>
            <Password
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              feedback={false}
              toggleMask={false}
              inputClassName="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all duration-200"
              placeholder="••••••••"
            />
          </div>

          {/* Remember Me / Forgot Password */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="accent-red-600" />
              <label htmlFor="remember" className="text-gray-600">
                Remember me
              </label>
            </div>
            <a
              href="#"
              className="text-red-600 hover:text-red-700 transition-colors duration-150"
            >
              Forgot password?
            </a>
          </div>

          {/* Login Button */}
          <Button
            label="Sign In"
            onClick={handleGetCourse}
            className="bg-red-600 hover:bg-red-700 border-none text-white font-semibold py-2 rounded-md transition-all duration-200 mt-3"
          />

          {/* Sign-up link */}
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <a href="#" className="text-red-600 hover:text-red-700 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
