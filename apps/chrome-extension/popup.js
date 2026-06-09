const DEFAULT_API_URL = "http://localhost:4000/api";
const tools = [
  ["word-to-pdf", "Word → PDF", ".doc,.docx,.odt"],
  ["pdf-to-word", "PDF → Word", ".pdf"],
  ["compress-pdf", "Nén PDF", ".pdf"],
  ["merge-pdf", "Ghép PDF", ".pdf", true],
  ["jpg-to-pdf", "JPG → PDF", ".jpg,.jpeg,.png", true],
  ["pdf-to-jpg", "PDF → JPG", ".pdf"],
  ["ocr-pdf", "OCR PDF", ".pdf"],
  ["split-pdf", "Tách PDF", ".pdf"],
  ["rotate-pdf", "Xoay PDF", ".pdf"],
  ["watermark-pdf", "Watermark", ".pdf"],
  ["add-page-numbers", "Đánh số trang", ".pdf"],
  ["protect-pdf", "Khóa PDF", ".pdf"],
  ["unlock-pdf", "Mở khóa PDF", ".pdf"],
  ["sign-pdf", "Ký PDF", ".pdf"]
];

const $ = (id) => document.getElementById(id);
let state = { apiUrl: DEFAULT_API_URL, token: null, user: null, historyPage: 1, historyPages: 1 };
let pollTimer;

async function loadState() {
  state = { ...state, ...await chrome.storage.local.get(["apiUrl", "token", "user"]) };
  state.apiUrl ||= DEFAULT_API_URL;
  $("api-url").value = state.apiUrl;
  renderSession();
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${state.apiUrl}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.blob();
  if (!response.ok) {
    const error = new Error(data?.message || "Không thể kết nối ScanPDF");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function message(text, error = false) {
  $("message").textContent = text;
  $("message").classList.toggle("error", error);
  $("message").classList.toggle("hidden", !text);
}

function renderSession() {
  $("login-view").classList.toggle("hidden", Boolean(state.token));
  $("app-view").classList.toggle("hidden", !state.token);
  $("account-label").textContent = state.user?.email || "Chưa đăng nhập";
}

function configureToolInput() {
  const selected = tools.find(([slug]) => slug === $("tool").value);
  $("files").accept = selected?.[2] || "";
  $("files").multiple = Boolean(selected?.[3]);
  const slug = selected?.[0];
  const options = $("tool-options");
  options.innerHTML = "";
  const definitions = {
    "rotate-pdf": ["angle", "Góc xoay", "select", [["90", "90°"], ["180", "180°"], ["270", "270°"]]],
    "watermark-pdf": ["text", "Nội dung watermark", "text"],
    "protect-pdf": ["password", "Mật khẩu PDF", "password"],
    "unlock-pdf": ["password", "Mật khẩu PDF", "password"],
    "sign-pdf": ["signer", "Tên người ký", "text"]
  };
  const definition = definitions[slug];
  if (!definition) return;
  const label = document.createElement("label");
  label.textContent = definition[1];
  let field;
  if (definition[2] === "select") {
    field = document.createElement("select");
    for (const [value, text] of definition[3]) {
      field.append(new Option(text, value));
    }
  } else {
    field = document.createElement("input");
    field.type = definition[2];
    field.required = true;
  }
  field.id = `option-${definition[0]}`;
  field.dataset.name = definition[0];
  label.append(field);
  options.append(label);
}

async function login(event) {
  event.preventDefault();
  message("");
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("email").value,
        password: $("password").value,
        otp: $("otp").value || undefined
      })
    });
    state.token = data.token;
    state.user = data.user;
    await chrome.storage.local.set({ token: data.token, user: data.user });
    renderSession();
  } catch (error) {
    if (error.data?.requiresTwoFactor) $("otp-label").classList.remove("hidden");
    message(error.message, true);
  }
}

async function convert() {
  const files = [...$("files").files];
  const tool = $("tool").value;
  if (!files.length) return message("Vui lòng chọn file", true);
  if (tool === "merge-pdf" && files.length < 2) return message("Ghép PDF cần ít nhất hai file", true);
  const button = $("convert-button");
  button.disabled = true;
  message("");
  try {
    const body = new FormData();
    for (const file of files) body.append(files.length > 1 ? "files" : "file", file);
    for (const input of $("tool-options").querySelectorAll("[data-name]")) {
      body.append(input.dataset.name, input.value);
    }
    const conversion = await api(`/convert/${tool}`, { method: "POST", body });
    showProgress(conversion.id);
  } catch (error) {
    message(error.message, true);
  } finally {
    button.disabled = false;
  }
}

function showProgress(id) {
  clearInterval(pollTimer);
  $("progress").classList.remove("hidden");
  $("progress").textContent = "Đã đưa vào hàng đợi...";
  pollTimer = setInterval(async () => {
    try {
      const conversion = await api(`/conversions/${id}`);
      $("progress").textContent = conversion.status === "PROCESSING" ? "Đang xử lý..." : "Đang chờ xử lý...";
      if (conversion.status === "COMPLETED") {
        clearInterval(pollTimer);
        $("progress").innerHTML = "";
        const button = document.createElement("button");
        button.className = "download";
        button.textContent = "Tải file kết quả";
        button.onclick = () => downloadResult(conversion);
        $("progress").append("Hoàn thành. ", button);
      }
      if (conversion.status === "FAILED") {
        clearInterval(pollTimer);
        $("progress").textContent = conversion.errorMessage || "Chuyển đổi thất bại";
      }
    } catch (error) {
      clearInterval(pollTimer);
      message(error.message, true);
    }
  }, 1800);
}

async function downloadResult(conversion) {
  try {
    const headers = state.token ? { Authorization: `Bearer ${state.token}` } : {};
    const downloadUrl = /^https?:\/\//.test(conversion.downloadUrl)
      ? conversion.downloadUrl
      : `${state.apiUrl.replace(/\/api\/?$/, "")}${conversion.downloadUrl}`;
    const response = await fetch(downloadUrl, { headers });
    if (!response.ok) throw new Error("Không thể tải file");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const filename = conversion.outputFile?.originalName || "scanpdf-result";
    await chrome.downloads.download({ url, filename, saveAs: true });
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) {
    message(error.message, true);
  }
}

async function loadHistory(page = state.historyPage) {
  const list = $("history-list");
  list.textContent = "Đang tải...";
  try {
    const data = await api(`/conversions?page=${page}&limit=5`);
    state.historyPage = data.page;
    state.historyPages = Math.max(1, data.pages);
    list.innerHTML = "";
    if (!data.items.length) list.textContent = "Chưa có lịch sử chuyển đổi.";
    for (const item of data.items) {
      const card = document.createElement("div");
      card.className = "history-item";
      const name = document.createElement("strong");
      name.textContent = item.inputFile?.originalName || item.tool;
      const meta = document.createElement("div");
      meta.className = "history-meta";
      meta.innerHTML = `<span>${item.tool.replaceAll("_", " ")}</span><span>${item.status}</span>`;
      card.append(name, meta);
      if (item.canDownload) {
        const download = document.createElement("button");
        download.className = "download";
        download.textContent = "Tải xuống";
        download.onclick = () => downloadResult(item);
        card.append(download);
      }
      list.append(card);
    }
    $("history-page").textContent = `Trang ${state.historyPage}/${state.historyPages}`;
    $("history-prev").disabled = state.historyPage <= 1;
    $("history-next").disabled = state.historyPage >= state.historyPages;
    $("history-pagination").classList.toggle("hidden", state.historyPages <= 1);
  } catch (error) {
    list.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  for (const [slug, label] of tools) $("tool").append(new Option(label, slug));
  configureToolInput();
  await loadState();
  $("login-form").addEventListener("submit", login);
  $("tool").addEventListener("change", configureToolInput);
  $("convert-button").addEventListener("click", convert);
  $("refresh-history").addEventListener("click", () => loadHistory());
  $("history-prev").addEventListener("click", () => loadHistory(state.historyPage - 1));
  $("history-next").addEventListener("click", () => loadHistory(state.historyPage + 1));
  $("logout-button").addEventListener("click", async () => {
    clearInterval(pollTimer);
    state.token = null;
    state.user = null;
    await chrome.storage.local.remove(["token", "user"]);
    renderSession();
  });
  $("settings-button").addEventListener("click", () => {
    $("settings-view").classList.toggle("hidden");
  });
  $("save-settings").addEventListener("click", async () => {
    state.apiUrl = $("api-url").value.replace(/\/$/, "") || DEFAULT_API_URL;
    await chrome.storage.local.set({ apiUrl: state.apiUrl });
    $("settings-view").classList.add("hidden");
    message("Đã lưu API URL");
  });
  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      const history = tab.dataset.tab === "history";
      $("history-tab").classList.toggle("hidden", !history);
      $("convert-tab").classList.toggle("hidden", history);
      if (history) loadHistory();
    });
  }
});
