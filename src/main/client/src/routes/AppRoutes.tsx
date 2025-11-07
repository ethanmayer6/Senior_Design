import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login.tsx";
import "../index.css";
import Register from "../pages/register.tsx";
import AdminDashboard from "../pages/AdminDashboard";
import CourseCatalog from "../pages/CourseCatalog.tsx";
import Dashboard from "../pages/Dashboard.tsx";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/catalog" element={<CourseCatalog />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
