import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import "../index.css";
import Register from "../pages/register";
import CourseCatalog from "../pages/CourseCatalog.tsx";
import Profile from "../pages/profile.tsx"

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/catalog" element={<CourseCatalog />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}