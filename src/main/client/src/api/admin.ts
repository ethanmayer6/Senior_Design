import axios from "axios";
import type { User } from "../types/user";

const API_BASE = "http://localhost:8080/api/admin";

const instance = axios.create({
  baseURL: API_BASE,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  console.log({ token });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getAllUsers = () => instance.get(`${API_BASE}/users`);
export const getUser = (id: number) => instance.get(`${API_BASE}/user/${id}`);
export const updateUser = (data: Partial<User>) => instance.put(`${API_BASE}/user`, data);
export const setRole = (data: Partial<User>) => instance.put(`${API_BASE}/setRole`, data);
export const deleteUser = (id: number) => instance.delete(`${API_BASE}/user`, { data: { id } });
