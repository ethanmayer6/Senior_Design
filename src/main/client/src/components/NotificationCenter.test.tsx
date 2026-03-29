import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import NotificationCenter from './NotificationCenter';
import { publishAppNotification } from '../utils/notifications';

describe('NotificationCenter', () => {
  it('renders notifications, supports action navigation, and passes axe', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <NotificationCenter />
                <div>Home page</div>
              </>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => {
      publishAppNotification({
        level: 'warning',
        title: 'Session Expired',
        message: 'Sign in again.',
        actionLabel: 'Go to Login',
        actionPath: '/login',
        ttlMs: 5000,
      });
    });

    expect(screen.getByText('Session Expired')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole('button', { name: 'Go to Login' }));
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('auto-dismisses notifications after their ttl', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    act(() => {
      publishAppNotification({
        level: 'info',
        title: 'Heads up',
        message: 'Short lived',
        ttlMs: 1000,
      });
    });

    expect(screen.getByText('Heads up')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Heads up')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
