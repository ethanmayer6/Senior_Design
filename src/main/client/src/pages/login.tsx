import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import axios from "axios";
import Header from "../components/header";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    try {
      const response = await axios.post(
        "http://localhost:8080/api/users/login",
        {
          email,
          password,
        }
      );
      console.log("✅ Login successful:", response.data);

      // Example: Save user info to local storage
      localStorage.setItem("user", JSON.stringify(response.data));
      alert("Welcome " + response.data.firstName + "!");
      // redirect or show a message
      // window.location.href = "/dashboard"; // adjust route
    } catch (err: any) {
      console.error("❌ Login failed:", err);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      {/* Logo Section */}
      <Header></Header>

      {/* Login Card */}
      <Card className="w-[400px] bg-white shadow-md rounded-xl flex flex-col items-center">
        {/* Header Text */}
        <div className="text-center mb-3">
          <p className="text-gray-500 text-sm">Please enter your details</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">
            Welcome back
          </h2>
        </div>

        {/* Form */}
        <div className="flex flex-col w-[360px] gap-5 m-0">
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
              className="w-full"
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
              inputClassName="w-full"
              placeholder="••••••••"
            />
          </div>

          {/* Remember Me / Forgot Password */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="accent-red-600 cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="text-gray-600 cursor-pointer"
              >
                Remember me
              </label>
            </div>
            <a
              href="#"
              className="text-red-600 hover:text-red-700 transition-colors duration-150 cursor-pointer"
            >
              Forgot password?
            </a>
          </div>

          {/* Login Button */}
          <Button
            label="Sign In"
            onClick={handleLogin}
            className="w-full justify-center py-2"
          />

          {/* Sign-up link */}
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <a
              href="/register"
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Sign up
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
