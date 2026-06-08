const tools = [
  { slug: "word-to-pdf", label: "Word → PDF", extensions: ["doc", "docx", "odt"] },
  { slug: "pdf-to-word", label: "PDF → Word", extensions: ["pdf"] },
  { slug: "compress-pdf", label: "Nén PDF", extensions: ["pdf"] },
  { slug: "merge-pdf", label: "Ghép PDF", extensions: ["pdf"], multiple: true, minimum: 2 },
  { slug: "jpg-to-pdf", label: "JPG → PDF", extensions: ["jpg", "jpeg", "png"], multiple: true },
  { slug: "pdf-to-jpg", label: "PDF → JPG", extensions: ["pdf"] },
  { slug: "ocr-pdf", label: "OCR PDF", extensions: ["pdf"] },
  { slug: "split-pdf", label: "Tách PDF", extensions: ["pdf"] },
  { slug: "rotate-pdf", label: "Xoay PDF", extensions: ["pdf"], option: ["angle", "Góc xoay", ["90", "180", "270"]] },
  { slug: "watermark-pdf", label: "Watermark PDF", extensions: ["pdf"], option: ["text", "Nội dung watermark"] },
  { slug: "add-page-numbers", label: "Đánh số trang", extensions: ["pdf"] },
  { slug: "protect-pdf", label: "Khóa PDF", extensions: ["pdf"], option: ["password", "Mật khẩu"] },
  { slug: "unlock-pdf", label: "Mở khóa PDF", extensions: ["pdf"], option: ["password", "Mật khẩu"] },
  { slug: "sign-pdf", label: "Ký PDF", extensions: ["pdf"], option: ["signer", "Tên người ký"] },
];
const $ = (id) => document.getElementById(id);
let selectedFiles = [];
let currentConfig;
let pollTimer;

function toast(text, error = false) {
  $("toast").textContent = text;
  $("toast").classList.toggle("error", error);
  $("toast").classList.remove("hidden");
  setTimeout(() => $("toast").classList.add("hidden"), 4000);
}

function renderSession(config) {
  currentConfig = config;
  $("login-view").classList.toggle("hidden", config.authenticated);
  $("navigation").classList.toggle("hidden", !config.authenticated);
  $("user-card").classList.toggle("hidden", !config.authenticated);
  if (config.user) {
    $("user-card").innerHTML = `<strong>${config.user.fullName}</strong><span>${config.user.email}</span>`;
    showView("convert");
  }
  $("api-url").value = config.apiUrl;
  $("login-api-url").value = config.apiUrl;
}

function showView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.add("hidden"));
  $(`${name}-view`).classList.remove("hidden");
  document.querySelectorAll(".nav").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  if (name === "history") loadHistory();
}

function configureTool() {
  selectedFiles = [];
  $("selected-files").textContent = "Chưa chọn file";
  $("convert-button").disabled = true;
  const tool = tools.find((item) => item.slug === $("tool").value);
  const options = $("tool-options");
  options.innerHTML = "";
  if (!tool?.option) return;
  const [name, label, values] = tool.option;
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const input = values ? document.createElement("select") : document.createElement("input");
  input.id = "tool-option";
  input.dataset.name = name;
  if (values) values.forEach((value) => input.append(new Option(`${value}°`, value)));
  else input.type = name === "password" ? "password" : "text";
  wrapper.append(input);
  options.append(wrapper);
}

async function selectFiles() {
  const tool = tools.find((item) => item.slug === $("tool").value);
  selectedFiles = await window.scanpdf.selectFiles({ multiple: tool.multiple, extensions: tool.extensions });
  $("selected-files").textContent = selectedFiles.length ? selectedFiles.join(", ") : "Chưa chọn file";
  $("convert-button").disabled = selectedFiles.length < (tool.minimum || 1);
}

async function convert() {
  const button = $("convert-button");
  button.disabled = true;
  try {
    const option = $("tool-option");
    const conversion = await window.scanpdf.createConversion({
      tool: $("tool").value,
      filePaths: selectedFiles,
      options: option ? { [option.dataset.name]: option.value } : {},
    });
    $("conversion-status").classList.remove("hidden");
    $("conversion-status").textContent = "Đã đưa vào hàng đợi...";
    pollConversion(conversion.id);
  } catch (error) {
    toast(error.message, true);
    button.disabled = false;
  }
}

function pollConversion(id) {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const item = await window.scanpdf.getConversion(id);
      $("conversion-status").textContent = item.status === "PROCESSING" ? "Đang xử lý..." : "Đang chờ xử lý...";
      if (item.status === "COMPLETED") {
        clearInterval(pollTimer);
        $("conversion-status").innerHTML = "";
        const button = document.createElement("button");
        button.className = "download";
        button.textContent = "Lưu file kết quả";
        button.onclick = () => download(item);
        $("conversion-status").append("Hoàn thành. ", button);
      }
      if (item.status === "FAILED") {
        clearInterval(pollTimer);
        $("conversion-status").textContent = item.errorMessage || "Chuyển đổi thất bại";
      }
    } catch (error) {
      clearInterval(pollTimer);
      toast(error.message, true);
    }
  }, 1800);
}

async function download(item) {
  try {
    const savedPath = await window.scanpdf.downloadConversion(item);
    if (savedPath) toast(`Đã lưu: ${savedPath}`);
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadHistory() {
  const list = $("history-list");
  list.textContent = "Đang tải...";
  try {
    const data = await window.scanpdf.listConversions();
    list.innerHTML = "";
    if (!data.items.length) list.textContent = "Chưa có lịch sử chuyển đổi.";
    for (const item of data.items) {
      const row = document.createElement("article");
      row.className = "history-item";
      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = item.inputFile?.originalName || item.tool;
      const date = document.createElement("small");
      date.textContent = new Date(item.createdAt).toLocaleString("vi-VN");
      info.append(name, date);
      const status = document.createElement("span");
      status.textContent = item.status;
      row.append(info, status);
      if (item.canDownload) {
        const button = document.createElement("button");
        button.className = "download";
        button.textContent = "Tải xuống";
        button.onclick = () => download(item);
        row.append(button);
      } else {
        row.append(document.createElement("span"));
      }
      list.append(row);
    }
  } catch (error) {
    list.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  tools.forEach((tool) => $("tool").append(new Option(tool.label, tool.slug)));
  configureTool();
  renderSession(await window.scanpdf.getConfig());
  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      currentConfig.apiUrl = await window.scanpdf.setApiUrl($("login-api-url").value);
      const user = await window.scanpdf.login({
        email: $("email").value,
        password: $("password").value,
        otp: $("otp").value || undefined,
      });
      renderSession({ ...currentConfig, authenticated: true, user });
    } catch (error) {
      if (error.message?.includes("2FA")) $("otp-label").classList.remove("hidden");
      toast(error.message, true);
    }
  });
  document.querySelectorAll(".nav").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
  $("tool").addEventListener("change", configureTool);
  $("select-files").addEventListener("click", selectFiles);
  $("convert-button").addEventListener("click", convert);
  $("refresh-history").addEventListener("click", loadHistory);
  $("save-api-url").addEventListener("click", async () => {
    currentConfig.apiUrl = await window.scanpdf.setApiUrl($("api-url").value);
    toast("Đã lưu API URL");
  });
  $("open-web").addEventListener("click", () => window.scanpdf.openExternal("https://scanpdf.vn"));
  $("logout-button").addEventListener("click", async () => {
    await window.scanpdf.logout();
    renderSession({ ...currentConfig, authenticated: false, user: null });
  });
});
