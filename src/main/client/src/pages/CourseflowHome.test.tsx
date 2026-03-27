import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as classScheduleApi from '../api/classScheduleApi';
import * as usersApi from '../api/usersApi';
import CourseflowHome from './CourseflowHome';

vi.mock('../components/header', () => ({
  default: () => <div data-testid="mock-header">Header</div>,
}));

vi.mock('../api/usersApi', () => ({
  getFriends: vi.fn(),
}));

vi.mock('../api/classScheduleApi', () => ({
  getCurrentClassSchedule: vi.fn(),
  getCourseByIdent: vi.fn(),
}));

describe('CourseflowHome walkthrough', () => {
  beforeEach(() => {
    vi.mocked(usersApi.getFriends).mockResolvedValue([]);
    vi.mocked(classScheduleApi.getCurrentClassSchedule).mockResolvedValue([]);
    vi.mocked(classScheduleApi.getCourseByIdent).mockResolvedValue(null);
  });

  it('shows the walkthrough once for a first-time student and allows dismissing it', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 7, role: 'USER', email: 'student@example.edu' }));

    render(
      <MemoryRouter>
        <CourseflowHome />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(window.localStorage.getItem('courseflow_home_walkthrough_seen_7')).toBe('true');
    });

    expect(screen.getByRole('dialog', { name: 'Welcome to CourseFlow' })).toBeInTheDocument();
    expect(screen.getAllByText('Flowchart Dashboard').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Start Exploring' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Welcome to CourseFlow' })).not.toBeInTheDocument();
    });
  });

  it('does not show the walkthrough after the student has already seen it', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 7, role: 'USER', email: 'student@example.edu' }));
    window.localStorage.setItem('courseflow_home_walkthrough_seen_7', 'true');

    render(
      <MemoryRouter>
        <CourseflowHome />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(usersApi.getFriends).toHaveBeenCalled();
    });

    expect(screen.queryByText('Here is a quick look at what you can do.')).not.toBeInTheDocument();
  });

  it('does not show the walkthrough for advisor accounts', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 9, role: 'ADVISOR', email: 'advisor@example.edu' }));

    render(
      <MemoryRouter>
        <CourseflowHome />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(classScheduleApi.getCurrentClassSchedule).toHaveBeenCalled();
    });

    expect(screen.queryByText('Here is a quick look at what you can do.')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('courseflow_home_walkthrough_seen_9')).toBeNull();
  });
});
