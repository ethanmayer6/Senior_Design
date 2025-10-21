import React, { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!username || !password) {
      alert("Please enter both username and password.");
      return;
    }
    alert(`Welcome, ${username}!`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen overflow-hidden bg-white text-black">
      {/* Logo */}
      <img
        src="/logo.png"
        alt="CourseFlow Logo"
        className="w-[400px] mb-6"
      />

      {/* Welcome Text */}
      <h2 className="text-2xl font-semibold mb-8 text-blue-500">Welcome Back!</h2>

      {/* Login Form */}
      <div className="flex flex-col w-[300px] ">
        {/* Username */}
        <div className="flex flex-col text-left space-y-1">
          <label
            htmlFor="username"
            className="text-sm font-medium text-blue-200"
          >
            Username
          </label>
          <InputText
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-inputtext-sm w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col text-left space-y-1">
          <label
            htmlFor="password"
            className="text-sm font-medium text-gray-800"
          >
            Password
          </label>
          <Password
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            feedback={false}
            toggleMask={false}
            inputClassName="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Login Button */}
        <Button
          label="Login"
          onClick={handleLogin}
          className="!bg-red-600 hover:!bg-red-700 !border-none !text-white font-semibold py-2 rounded-md transition-all duration-150"
        />
      </div>
    </div>
  );
}