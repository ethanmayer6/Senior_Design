import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
const requestUse = vi.fn();
const responseUse = vi.fn();
const apiInstance = {
  interceptors: {
    request: { use: requestUse },
    response: { use: responseUse },
  },
};

vi.mock('axios', () => ({
  default: { create },
  create,
}));

vi.mock('../Env', () => ({
  Env: {
    API_BASE_URL: 'api',
  },
}));

vi.mock('../utils/notifications', () => ({
  publishAppNotification: vi.fn(),
}));

describe('axiosClient', () => {
  beforeEach(() => {
    vi.resetModules();
    create.mockReset();
    requestUse.mockReset();
    responseUse.mockReset();
    create.mockReturnValue(apiInstance);
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('normalizes the base URL and adds the bearer token to requests', async () => {
    window.localStorage.setItem('token', 'abc123');

    const module = await import('./axiosClient');

    expect(create).toHaveBeenCalledWith({ baseURL: '/api' });
    const interceptor = requestUse.mock.calls[0][0];
    const config = { headers: {} as Record<string, string> };

    expect(interceptor(config)).toBe(config);
    expect(config.headers.Authorization).toBe('Bearer abc123');
    expect(module.default).toBe(apiInstance);
  });

  it('publishes a warning, clears auth storage, and redirects on 401 responses', async () => {
    window.localStorage.setItem('token', 'abc123');
    window.localStorage.setItem('user', '{"id":7}');
    const assignSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, pathname: '/dashboard', assign: assignSpy });

    const { publishAppNotification } = await import('../utils/notifications');
    await import('./axiosClient');
    const rejectHandler = responseUse.mock.calls[0][1];
    const error = { response: { status: 401 } };

    await expect(rejectHandler(error)).rejects.toBe(error);
    expect(publishAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warning',
        title: 'Session Expired',
        actionPath: '/login',
      }),
    );
    expect(window.localStorage.getItem('token')).toBeNull();
    expect(window.localStorage.getItem('user')).toBeNull();
    expect(assignSpy).toHaveBeenCalledWith('/login');
  });

  it('does not redirect again when the user is already on an auth route', async () => {
    const assignSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, pathname: '/login/reset', assign: assignSpy });

    await import('./axiosClient');
    const rejectHandler = responseUse.mock.calls[0][1];

    await expect(rejectHandler({ response: { status: 401 } })).rejects.toEqual({
      response: { status: 401 },
    });
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
