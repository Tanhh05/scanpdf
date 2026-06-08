import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const api = axios.create({ baseURL: API_BASE_URL });
export const adminApi = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const state = localStorage.getItem("scanpdf-auth");
    const token = state ? JSON.parse(state)?.state?.token : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const state = localStorage.getItem("scanpdf-admin-auth");
    const token = state ? JSON.parse(state)?.state?.token : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
