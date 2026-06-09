import axios from "axios";

export const API_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://scanpdf-backend.onrender.com/api"
  : process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000/api";

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
    try {
      const state = localStorage.getItem("scanpdf-admin-auth");
      const token = state ? JSON.parse(state)?.state?.token : null;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      localStorage.removeItem("scanpdf-admin-auth");
    }
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      localStorage.removeItem("scanpdf-admin-auth");
      if (window.location.pathname !== "/admin/login") {
        window.location.replace("/admin/login?expired=1");
      }
    }
    return Promise.reject(error);
  },
);
