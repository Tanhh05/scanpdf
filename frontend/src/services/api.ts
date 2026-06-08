import axios from "axios";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://scanpdf-backend.onrender.com/api"
    : "http://localhost:4000/api";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const shouldIgnoreConfiguredApiUrl =
  process.env.NODE_ENV === "production" &&
  (!configuredApiBaseUrl ||
    configuredApiBaseUrl.includes("localhost") ||
    configuredApiBaseUrl.includes("api.scanpdf.vn"));

export const API_BASE_URL = shouldIgnoreConfiguredApiUrl
  ? DEFAULT_API_BASE_URL
  : configuredApiBaseUrl ?? DEFAULT_API_BASE_URL;

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
