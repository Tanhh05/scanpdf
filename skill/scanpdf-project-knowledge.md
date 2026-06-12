# ScanPDF Project Knowledge

## Tổng Quan

ScanPDF là monorepo Node.js gồm backend Express/Prisma và frontend Next.js.

- Frontend chính nằm trong `frontend/`.
- Backend API nằm trong `backend/`.
- Database dùng PostgreSQL qua Prisma.
- Queue dùng BullMQ/Redis.
- Backend production deploy lên Render service `scanpdf-backend`.
- Frontend production deploy lên Vercel.

## Frontend

Frontend dùng Next.js App Router, Tailwind CSS, React Query và Zustand.

Các khu vực chính:

- Client routes: `frontend/src/app/(client)/`
- Admin routes: `frontend/src/app/admin/`
- Shared components: `frontend/src/components/common/`
- Client tool components: `frontend/src/components/client/`
- Admin shell/ui: `frontend/src/components/admin/`

Các component quan trọng:

- `Header`: header client, desktop dùng dropdown, mobile dùng menu.
- `ToolWorkspace`: layout riêng cho trang `/tools/*`, desktop có sidebar, mobile dùng nhóm công cụ dạng accordion.
- `ToolUploader`: upload/chuyển đổi file.
- `MediaDownloader`: TikTok/YouTube/Facebook/Instagram downloader landing page.
- `AdminShell`: sidebar/header admin, mobile dùng drawer.

## Responsive Mobile

Nguyên tắc khi sửa mobile:

- Không đổi desktop nếu user yêu cầu giữ web.
- Ưu tiên class mobile mặc định, desktop đặt qua `sm:`, `md:`, `lg:`.
- Tránh `min-w-*` trên mobile nếu không bọc `overflow-x-auto`.
- Header mobile cần full width, không dùng flex 2 nút nếu width nhỏ; dùng grid khi cần.
- Tool mobile nên nhóm theo category, bấm mới xổ chức năng, không render hàng ngang quá dài.
- Bảng admin/client được phép scroll ngang trong container.

## Dark Mode

Dark mode dựa vào class `.dark` trên `html`.

- `ThemeToggle` cập nhật `localStorage`, `document.documentElement.classList` và dispatch event `scanpdf-theme-change`.
- Tránh hard-code nền sáng mà không có `dark:*`.
- `globals.css` có fallback cho nhiều class arbitrary như `bg-[#f4f6fb]`, `text-[#111527]`.

## Backend

Backend dùng Express 5, Prisma, BullMQ, Redis, Zod.

Các file quan trọng:

- `backend/src/app.ts`: mount middleware/routes.
- `backend/src/config/env.ts`: schema env bằng Zod.
- `backend/src/config/prisma.ts`: Prisma client.
- `backend/src/routes/convert.routes.ts`: conversion tools.
- `backend/src/routes/download.routes.ts`: downloader API.
- `backend/src/services/downloader.service.ts`: logic yt-dlp.
- `backend/src/workers/conversion.worker.ts`: worker xử lý file.

Downloader:

- Dùng `yt-dlp`.
- Docker production đóng gói `yt-dlp` tại `/usr/local/bin/yt-dlp`.
- Env `YT_DLP_PATH` trỏ vào binary production.
- TikTok hỗ trợ URL rút gọn `vt.tiktok.com` và `vm.tiktok.com`.
- Các request yt-dlp có timeout/retry ngắn để tránh treo API.

## Deploy

Render backend:

- Service ID: `srv-d8jev26q1p3s73fmjkpg`
- Service name: `scanpdf-backend`
- URL: `https://scanpdf-backend.onrender.com`
- Health: `https://scanpdf-backend.onrender.com/health/ready`
- GitHub secret: `RENDER_API_KEY`
- GitHub variable: `RENDER_SERVICE_ID`

Workflow Render:

- `.github/workflows/backend-render-deploy.yml`
- Chạy sau khi `Backend CI` success.
- Gọi Render API để deploy backend mới nhất.

Vercel frontend:

- `.github/workflows/frontend-vercel-deploy.yml`
- Dùng `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## CI

Backend CI:

- `.github/workflows/backend-ci.yml`
- Có PostgreSQL service.
- Có Redis service.
- Chạy `db:generate`, `db:deploy`, lint, build, test.

Frontend CI:

- `.github/workflows/frontend-deploy.yml`
- Chạy lint/build frontend.

Các lệnh kiểm tra thường dùng:

```bash
npm run lint -w frontend
npm run build -w frontend
npm run lint -w backend
npm run build -w backend
npm run test -w backend
git diff --check
```

## Quy Tắc Khi Sửa Dự Án

- Không revert thay đổi user nếu không được yêu cầu.
- Khi push deploy backend, kiểm tra Backend CI và Render deployment live.
- Khi sửa frontend, tối thiểu chạy `npm run lint -w frontend`.
- Khi sửa backend, chạy lint/build/test backend.
- Khi sửa dark mode, kiểm tra cả client và admin.
- Khi sửa mobile, giữ desktop bằng breakpoint `sm:`/`md:`/`lg:`.

