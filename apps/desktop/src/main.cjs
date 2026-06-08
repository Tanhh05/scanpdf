const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require("electron");
const { readFile, writeFile, mkdir } = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_API_URL = "http://localhost:4000/api";
let mainWindow;

function configPath() {
  return path.join(app.getPath("userData"), "config.json");
}

async function readConfig() {
  try {
    return JSON.parse(await readFile(configPath(), "utf8"));
  } catch {
    return { apiUrl: DEFAULT_API_URL };
  }
}

async function writeConfig(patch) {
  const config = { ...await readConfig(), ...patch };
  await mkdir(path.dirname(configPath()), { recursive: true });
  await writeFile(configPath(), JSON.stringify(config, null, 2), "utf8");
  return config;
}

function encryptToken(token) {
  if (!token) return null;
  if (!safeStorage.isEncryptionAvailable()) return Buffer.from(token).toString("base64");
  return safeStorage.encryptString(token).toString("base64");
}

function decryptToken(value) {
  if (!value) return null;
  const encrypted = Buffer.from(value, "base64");
  if (!safeStorage.isEncryptionAvailable()) return encrypted.toString("utf8");
  try {
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

async function session() {
  const config = await readConfig();
  return {
    apiUrl: config.apiUrl || DEFAULT_API_URL,
    token: decryptToken(config.token),
    user: config.user || null,
  };
}

function absoluteUrl(apiUrl, value) {
  if (!value) return value;
  if (/^https?:\/\//.test(value)) return value;
  return new URL(value, apiUrl.replace(/\/api\/?$/, "")).toString();
}

async function request(endpoint, options = {}) {
  const current = await session();
  const headers = new Headers(options.headers || {});
  if (current.token) headers.set("Authorization", `Bearer ${current.token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${current.apiUrl}${endpoint}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.arrayBuffer();
  if (!response.ok) {
    const error = new Error(data?.message || `API trả về lỗi ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function registerIpc() {
  ipcMain.handle("config:get", async () => {
    const current = await session();
    return { apiUrl: current.apiUrl, user: current.user, authenticated: Boolean(current.token) };
  });
  ipcMain.handle("config:set-api-url", async (_event, apiUrl) => {
    const normalized = String(apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
    await writeConfig({ apiUrl: normalized });
    return normalized;
  });
  ipcMain.handle("auth:login", async (_event, credentials) => {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    await writeConfig({ token: encryptToken(data.token), user: data.user });
    return data.user;
  });
  ipcMain.handle("auth:logout", async () => {
    await writeConfig({ token: null, user: null });
  });
  ipcMain.handle("files:select", async (_event, options = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Chọn tài liệu",
      properties: options.multiple ? ["openFile", "multiSelections"] : ["openFile"],
      filters: [{ name: "Tài liệu", extensions: options.extensions || ["pdf"] }],
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle("convert:create", async (_event, payload) => {
    const body = new FormData();
    for (const filePath of payload.filePaths) {
      const buffer = await readFile(filePath);
      const filename = path.basename(filePath);
      body.append(payload.filePaths.length > 1 ? "files" : "file", new Blob([buffer]), filename);
    }
    for (const [key, value] of Object.entries(payload.options || {})) {
      if (value !== undefined && value !== "") body.append(key, String(value));
    }
    return request(`/convert/${payload.tool}`, { method: "POST", body });
  });
  ipcMain.handle("conversions:list", () => request("/conversions?limit=50"));
  ipcMain.handle("conversions:get", (_event, id) => request(`/conversions/${id}`));
  ipcMain.handle("conversions:download", async (_event, conversion) => {
    const current = await session();
    const url = absoluteUrl(current.apiUrl, conversion.downloadUrl);
    const headers = current.token ? { Authorization: `Bearer ${current.token}` } : {};
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error("Không thể tải file kết quả");
    const suggestedName = conversion.outputFile?.originalName || "scanpdf-result";
    const result = await dialog.showSaveDialog(mainWindow, { defaultPath: suggestedName });
    if (result.canceled || !result.filePath) return null;
    await writeFile(result.filePath, Buffer.from(await response.arrayBuffer()));
    return result.filePath;
  });
  ipcMain.handle("shell:open", (_event, url) => shell.openExternal(url));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 880,
    minHeight: 620,
    backgroundColor: "#0f172a",
    title: "ScanPDF",
    icon: path.join(__dirname, "../assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
