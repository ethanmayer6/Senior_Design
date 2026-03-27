import { describe, expect, it, vi } from 'vitest';
import { publishAppNotification, subscribeToAppNotifications } from './notifications';

describe('notification utilities', () => {
  it('publishes notifications with a generated id', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToAppNotifications(handler);

    publishAppNotification({
      level: 'success',
      title: 'Saved',
      message: 'Your changes were saved.',
      actionLabel: 'View',
      actionPath: '/dashboard',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      level: 'success',
      title: 'Saved',
      message: 'Your changes were saved.',
      actionLabel: 'View',
      actionPath: '/dashboard',
    });
    expect(handler.mock.calls[0][0].id).toMatch(/^\d+-[a-z0-9]+$/);

    unsubscribe();
  });

  it('stops delivering events after unsubscribe is called', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToAppNotifications(handler);

    unsubscribe();
    publishAppNotification({
      level: 'info',
      title: 'Heads up',
      message: 'This should not reach the removed handler.',
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
