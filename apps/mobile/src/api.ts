import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import type { Conversion, PickedFile, User } from "./types";

const TOKEN_KEY = "scanpdf-token";
const API_URL_KEY = "scanpdf-api-url";
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";

export async function getApiUrl() {
  return (await SecureStore.getItemAsync(API_URL_KEY)) || DEFAULT_API_URL;
}

export async function setApiUrl(value: string) {
  const normalized = value.trim().replace(/\/$/, "");
  await SecureStore.setItemAsync(API_URL_KEY, normalized);
  return normalized;
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const [apiUrl, token] = await Promise.all([getApiUrl(), getToken()]);
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Không thể kết nối ScanPDF") as Error & {
      requiresTwoFactor?: boolean;
    };
    error.requiresTwoFactor = data.requiresTwoFactor;
    throw error;
  }
  return data as T;
}

export async function login(email: string, password: string, otp?: string) {
  const data = await request<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, otp: otp || undefined }),
  });
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  return data.user;
}

export function getMe() {
  return request<User>("/auth/me");
}

export async function createConversion(
  tool: string,
  files: PickedFile[],
  options: Record<string, string>,
) {
  const body = new FormData();
  files.forEach((file) => {
    body.append(files.length > 1 ? "files" : "file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    } as unknown as Blob);
  });
  Object.entries(options).forEach(([key, value]) => {
    if (value) body.append(key, value);
  });
  return request<Conversion>(`/convert/${tool}`, { method: "POST", body });
}

export function getConversion(id: string) {
  return request<Conversion>(`/conversions/${id}`);
}

export function getConversions(page = 1) {
  return request<{ items: Conversion[]; total: number; page: number; pages: number; limit: number }>(
    `/conversions?page=${page}&limit=5`,
  );
}

function absoluteDownloadUrl(apiUrl: string, value: string) {
  if (/^https?:\/\//.test(value)) return value;
  return `${apiUrl.replace(/\/api\/?$/, "")}${value}`;
}

export async function downloadAndShare(conversion: Conversion) {
  if (!conversion.downloadUrl) throw new Error("File kết quả chưa sẵn sàng");
  const [apiUrl, token] = await Promise.all([getApiUrl(), getToken()]);
  const filename = conversion.outputFile?.originalName || `scanpdf-${conversion.id}`;
  const destination = `${FileSystem.cacheDirectory}${filename.replace(/[^\w.\-]+/g, "_")}`;
  const result = await FileSystem.downloadAsync(
    absoluteDownloadUrl(apiUrl, conversion.downloadUrl),
    destination,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!(await Sharing.isAvailableAsync())) return result.uri;
  await Sharing.shareAsync(result.uri);
  return result.uri;
}
