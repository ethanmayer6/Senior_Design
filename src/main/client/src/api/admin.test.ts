import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestUse = vi.fn();
const instance = {
  interceptors: {
    request: { use: requestUse },
  },
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
const create = vi.fn(() => instance);

vi.mock('axios', () => ({
  default: { create },
  create,
}));

describe('admin api client', () => {
  beforeEach(() => {
    vi.resetModules();
    requestUse.mockReset();
    create.mockClear();
    instance.get.mockReset();
    instance.put.mockReset();
    instance.delete.mockReset();
    window.localStorage.clear();
  });

  it('adds the bearer token to admin requests and exposes CRUD helpers', async () => {
    window.localStorage.setItem('token', 'secret-token');
    const module = await import('./admin');
    const interceptor = requestUse.mock.calls[0][0];
    const config = { headers: {} as Record<string, string> };
    interceptor(config);

    expect(create).toHaveBeenCalledWith({ baseURL: 'http://localhost:8080/api/admin' });
    expect(config.headers.Authorization).toBe('Bearer secret-token');

    await module.getAllUsers();
    await module.getUser(7);
    await module.updateUser({ firstName: 'Ada' });
    await module.setRole({ id: 7, role: 'ADMIN' } as never);
    await module.deleteUser(7);

    expect(instance.get).toHaveBeenNthCalledWith(1, 'http://localhost:8080/api/admin/users');
    expect(instance.get).toHaveBeenNthCalledWith(2, 'http://localhost:8080/api/admin/user/7');
    expect(instance.put).toHaveBeenNthCalledWith(1, 'http://localhost:8080/api/admin/user', { firstName: 'Ada' });
    expect(instance.put).toHaveBeenNthCalledWith(2, 'http://localhost:8080/api/admin/setRole', { id: 7, role: 'ADMIN' });
    expect(instance.delete).toHaveBeenCalledWith('http://localhost:8080/api/admin/user', { data: { id: 7 } });
  });
});
