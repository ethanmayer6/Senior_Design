import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('./axiosClient', () => ({
  default: api,
}));

describe('admin api client', () => {
  beforeEach(() => {
    vi.resetModules();
    api.get.mockReset();
    api.put.mockReset();
    api.delete.mockReset();
    window.localStorage.clear();
  });

  it('uses the shared API client and exposes CRUD helpers', async () => {
    const module = await import('./admin');

    await module.getAllUsers();
    await module.getUser(7);
    await module.updateUser({ firstName: 'Ada' });
    await module.setRole({ id: 7, role: 'ADMIN' } as never);
    await module.deleteUser(7);

    expect(api.get).toHaveBeenNthCalledWith(1, '/admin/users');
    expect(api.get).toHaveBeenNthCalledWith(2, '/admin/user/7');
    expect(api.put).toHaveBeenNthCalledWith(1, '/admin/user', { firstName: 'Ada' });
    expect(api.put).toHaveBeenNthCalledWith(2, '/admin/setRole', { id: 7, role: 'ADMIN' });
    expect(api.delete).toHaveBeenCalledWith('/admin/user', { data: { id: 7 } });
  });
});
