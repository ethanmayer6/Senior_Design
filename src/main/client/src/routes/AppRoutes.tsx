import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import CourseCatalog from "../pages/courseCatalog";
import "../index.css"

export default function AppRoutes(){
    return(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/courses" element={<CourseCatalog />} />
    </Routes>
  </BrowserRouter>
    );
}