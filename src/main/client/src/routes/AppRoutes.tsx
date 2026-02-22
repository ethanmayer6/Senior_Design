import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/login.tsx';
import '../index.css';
import Register from '../pages/register.tsx';
import AdminDashboard from '../pages/AdminDashboard';
import CourseCatalog from '../pages/CourseCatalog.tsx';
import CourseBadges from '../pages/CourseBadges.tsx';
import Profile from '../pages/profile.tsx';
import Landing from '../pages/landing.tsx';
import Dashboard from '../pages/Dashboard.tsx';
import CourseflowHome from '../pages/CourseflowHome.tsx';
import StudentSearch from '../pages/StudentSearch.tsx';
import Settings from '../pages/Settings.tsx';
import SmartScheduler from '../pages/SmartScheduler.tsx';
import CurrentClasses from '../pages/CurrentClasses.tsx';
import MajorsBrowse from '../pages/MajorsBrowse.tsx';
import NotificationCenter from '../components/NotificationCenter.tsx';
import GlobalCommandPalette from '../components/GlobalCommandPalette.tsx';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <NotificationCenter />
      <GlobalCommandPalette />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/courseflow" element={<CourseflowHome />} />
        <Route path="/catalog" element={<CourseCatalog />} />
        <Route path="/badges" element={<CourseBadges />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/student-search" element={<StudentSearch />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/smart-scheduler" element={<SmartScheduler />} />
        <Route path="/current-classes" element={<CurrentClasses />} />
        <Route path="/majors" element={<MajorsBrowse />} />
      </Routes>
    </BrowserRouter>
  );
}
