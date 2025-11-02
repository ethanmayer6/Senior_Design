import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import "../index.css";
import Register from "../pages/register";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}