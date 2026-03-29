import type { User } from "../types/user";
import api from "./axiosClient";

export const getAllUsers = () => api.get('/admin/users');
export const getUser = (id: number) => api.get(`/admin/user/${id}`);
export const updateUser = (data: Partial<User>) => api.put('/admin/user', data);
export const setRole = (data: Partial<User>) => api.put('/admin/setRole', data);
export const deleteUser = (id: number) => api.delete('/admin/user', { data: { id } });
