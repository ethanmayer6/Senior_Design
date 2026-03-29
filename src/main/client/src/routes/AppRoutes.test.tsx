import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppRoutes from './AppRoutes';

vi.mock('../pages/login.tsx', () => ({ default: () => <div>Login Page</div> }));
vi.mock('../pages/register.tsx', () => ({ default: () => <div>Register Page</div> }));
vi.mock('../pages/AdminDashboard', () => ({ default: () => <div>Admin Page</div> }));
vi.mock('../pages/CourseCatalog.tsx', () => ({ default: () => <div>Catalog Page</div> }));
vi.mock('../pages/CourseBadges.tsx', () => ({ default: () => <div>Badges Page</div> }));
vi.mock('../pages/profile.tsx', () => ({ default: () => <div>Profile Page</div> }));
vi.mock('../pages/landing.tsx', () => ({ default: () => <div>Landing Page</div> }));
vi.mock('../pages/Dashboard.tsx', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('../pages/CourseflowHome.tsx', () => ({ default: () => <div>CourseFlow Home</div> }));
vi.mock('../pages/StudentSearch.tsx', () => ({ default: () => <div>Student Search Page</div> }));
vi.mock('../pages/Settings.tsx', () => ({ default: () => <div>Settings Page</div> }));
vi.mock('../pages/SmartScheduler.tsx', () => ({ default: () => <div>Scheduler Page</div> }));
vi.mock('../pages/CurrentClasses.tsx', () => ({ default: () => <div>Current Classes Page</div> }));
vi.mock('../pages/MajorsBrowse.tsx', () => ({ default: () => <div>Majors Page</div> }));
vi.mock('../pages/ProfessorReviews.tsx', () => ({ default: () => <div>Professors Page</div> }));
vi.mock('../pages/Games.tsx', () => ({ default: () => <div>Games Page</div> }));
vi.mock('../pages/CourseReviews.tsx', () => ({ default: () => <div>Course Reviews Page</div> }));
vi.mock('../pages/Dining.tsx', () => ({ default: () => <div>Dining Page</div> }));
vi.mock('../components/NotificationCenter.tsx', () => ({ default: () => <div>Notification Center</div> }));
vi.mock('../components/GlobalCommandPalette.tsx', () => ({ default: () => <div>Command Palette</div> }));

describe('AppRoutes', () => {
  it('renders the landing route with shared chrome', () => {
    window.history.pushState({}, '', '/');

    render(<AppRoutes />);

    expect(screen.getByText('Landing Page')).toBeInTheDocument();
    expect(screen.getByText('Notification Center')).toBeInTheDocument();
    expect(screen.getByText('Command Palette')).toBeInTheDocument();
  });

  it('renders named routes from the router map', () => {
    window.history.pushState({}, '', '/dining');

    render(<AppRoutes />);

    expect(screen.getByText('Dining Page')).toBeInTheDocument();
  });
});
