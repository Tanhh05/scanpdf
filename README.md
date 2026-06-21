# ScanPDF

Nền tảng SaaS chuyển đổi tài liệu dùng Next.js, Express, PostgreSQL, Redis/BullMQ và LibreOffice.

## Chức năng đã triển khai

- Đăng ký, đăng nhập JWT và phân quyền USER/ADMIN.
- Xác thực email bằng token, hỗ trợ gửi lại email xác thực.
- Đăng nhập Google OpenID Connect và GitHub OAuth, tự liên kết tài khoản bằng email đã xác minh.
- Gói Free/Pro/Business, quota theo ngày và giới hạn dung lượng.
- Word/DOCX/ODT sang PDF bằng LibreOffice.
- PDF sang DOCX theo hướng text-first bằng `pdftotext`.
- Ghép PDF, nén PDF, JPG/PNG sang PDF và PDF sang bộ ảnh JPG đóng ZIP.
- Tách, xoay, xóa, sắp xếp, đánh số trang, watermark và bảo vệ PDF bằng mật khẩu.
- OCR PDF tiếng Việt/Anh, tạo PDF có thể tìm kiếm nội dung.
- AI PDF: Chat PDF, tóm tắt PDF và trích xuất thông tin từ PDF bằng OpenAI Responses API.
- Quên mật khẩu bằng reset token, hỗ trợ link reset local khi phát triển.
- Admin cleanup file hết hạn qua `POST /api/admin/cleanup/expired-files`.
- Upload local hoặc Supabase Storage, lịch sử, polling trạng thái và download có kiểm tra quyền.
- Lịch sử có tìm kiếm, lọc trạng thái, phân trang, tải lại và xóa file.
- Chia sẻ file kết quả bằng link có thời hạn, tùy chọn mật khẩu.
- Batch convert nhiều file cho Word sang PDF, nén PDF và PDF sang JPG.
- Ký PDF trực quan bằng tên người ký và ngày ký.
- Xác thực hai lớp 2FA bằng TOTP.
- Queue BullMQ, worker riêng, retry và priority cho gói trả phí.
- Dashboard người dùng, cập nhật hồ sơ, đổi mật khẩu, gói Free/Pro và VietQR từ PayOS với webhook tự động.
- Admin dashboard, quản lý người dùng, gói dịch vụ, subscription, audit log, thanh toán và thống kê 30 ngày.
- Public API cho gói Business qua `X-API-Key` tại `/api/v1/convert/:tool`.
- Team workspace Business: tạo team, mời thành viên, role owner/admin/member và quota theo team.
- Email thông báo khi chuyển đổi hoàn tất/thất bại và khi thanh toán thành công.
- Tải hóa đơn PDF cho giao dịch đã thanh toán.
- Rate limiting cho API, auth và Public API.
- Monitoring cơ bản: request id, log request chậm/lỗi, `/health` và `/health/ready`.
- Monitoring nâng cao tùy chọn bằng Sentry cho backend, worker và frontend.
- Backup PostgreSQL/storage bằng script và GitHub Actions scheduled workflow.
- Test tự động cho health, auth guard, admin guard, public API guard, payment status, rate-limit headers, monitoring và 2FA helper.
- Mobile App Expo cho iOS/Android: đăng nhập, upload, lịch sử và tải/chia sẻ kết quả.
- Chrome Extension Manifest V3: chuyển đổi, theo dõi trạng thái và tải file ngay trong popup.
- Desktop App Electron cho macOS/Windows/Linux với token mã hóa và hộp thoại file native.
- Docker Compose và GitHub Actions.

## Kiến trúc route và module

ScanPDF nên giữ cấu trúc route theo nhóm chức năng để tách rõ marketing, ứng dụng người dùng, công cụ xử lý tài liệu và quản trị. Với Next.js App Router, các nhóm layout nên được tổ chức theo route group:

```text
frontend/src/app
├── (marketing)
│   ├── page.tsx
│   ├── pricing
│   ├── features
│   ├── tools
│   ├── blog
│   ├── contact
│   └── privacy
├── (auth)
│   ├── login
│   ├── register
│   ├── forgot-password
│   ├── reset-password
│   └── verify-email
├── (dashboard)
│   └── dashboard
├── (admin)
│   └── admin
└── api
```

Mỗi nhóm có layout riêng:

- `MarketingLayout`: trang giới thiệu, SEO, pricing, danh sách công cụ.
- `AuthLayout`: đăng nhập, đăng ký, quên mật khẩu, xác thực email.
- `DashboardLayout`: khu vực người dùng sau đăng nhập.
- `AdminLayout`: khu vực quản trị nội bộ.

Route người dùng nên tập trung trong `/dashboard`:

```text
/dashboard
/dashboard/history
/dashboard/profile
/dashboard/security
/dashboard/billing
/dashboard/api-keys
/dashboard/teams
/dashboard/share-links
/dashboard/notifications
```

Các công cụ chuyển đổi nên tách thành route public riêng thay vì đặt dưới dashboard:

```text
/tools/word-to-pdf
/tools/pdf-to-word
/tools/merge-pdf
/tools/compress-pdf
/tools/split-pdf
/tools/rotate-pdf
/tools/watermark
/tools/ocr
/tools/chat-pdf
/tools/summary
/tools/extract
```

Cách này giúp SEO tốt hơn, mỗi công cụ có mô tả riêng, có thể chia sẻ link trực tiếp và dễ quảng bá trên Google giống các dịch vụ như Smallpdf hoặc iLovePDF.

Khu vực admin nên mở rộng theo các route rõ ràng:

```text
/admin/login
/admin/dashboard
/admin/users
/admin/users/:id
/admin/plans
/admin/subscriptions
/admin/payments
/admin/statistics
/admin/files
/admin/jobs
/admin/logs
/admin/settings
/admin/system
/admin/monitoring
```

Backend API nên tách theo domain:

```text
/api/auth
/api/users
/api/documents
/api/payments
/api/subscriptions
/api/teams
/api/api-keys
/api/notifications
/api/admin/users
/api/admin/plans
/api/admin/payments
/api/admin/statistics
/api/admin/audit-logs
/api/admin/cleanup
/api/admin/settings
/api/v1/convert
```

Business API giữ ổn định ở namespace `/api/v1`:

```text
/api/v1/convert/compress-pdf
/api/v1/convert/merge-pdf
/api/v1/convert/pdf-to-word
```

Khi dự án lớn hơn, có thể tách theo subdomain:

- `scanpdf.vn`: marketing website.
- `app.scanpdf.vn`: dashboard người dùng.
- `admin.scanpdf.vn`: trang quản trị.
- `api.scanpdf.vn`: Express API.

Cấu trúc này giúp tách biệt marketing, ứng dụng và quản trị, dễ mở rộng deploy độc lập, đồng thời hỗ trợ phân quyền và bảo mật rõ hơn.

## Chạy local bằng npm

Yêu cầu: Node.js 20+, PostgreSQL, Redis, LibreOffice, Poppler và qpdf.

Trên macOS:

```bash
brew install postgresql@17 redis poppler ghostscript qpdf tesseract-lang
brew install --cask libreoffice
brew services start postgresql@17
brew services start redis
```

Sau khi đã tạo database `scanpdf`:

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend: `http://localhost:3000`  
API: `http://localhost:4000`  
Health check: `http://localhost:4000/health`
Readiness check: `http://localhost:4000/health/ready`

Chạy kiểm tra:

```bash
npm run lint
npm run test
npm run build
```

Kiểm tra và build ba ứng dụng bổ sung:

```bash
npm run mobile:typecheck
npm run extension:build
npm run desktop:build
npm run apps:build
```

Worker dùng `soffice`, Poppler, Ghostscript, qpdf và Tesseract để xử lý tài liệu.

Backup local:

```bash
npm run backup:postgres
npm run backup:storage
npm run backup:supabase-storage
```

Workflow `.github/workflows/backup.yml` chạy theo lịch khi repository variable
`ENABLE_BACKUP=true`. Đặt thêm `ENABLE_SUPABASE_STORAGE_BACKUP=true`, các
secret Supabase và variable `SUPABASE_BUCKET` để sao lưu cả bucket Storage.

## OpenAI AI PDF

Điền `OPENAI_API_KEY` để bật Chat PDF, tóm tắt PDF và trích xuất thông tin. Có thể đổi model bằng `OPENAI_MODEL`.
PDF scan nên chạy OCR trước để AI đọc được nội dung tốt hơn.

## Email quên mật khẩu

Điền SMTP để gửi email đặt lại mật khẩu thật:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=ScanPDF <your-email@gmail.com>
```

Khi chưa cấu hình SMTP, môi trường local sẽ trả link reset để test nhanh.

Email xác thực tài khoản cũng dùng cùng SMTP. Khi chưa cấu hình SMTP, môi trường local trả `verifyUrl` để test nhanh.

## Public API

Gói Business có thể tạo API key trong `/dashboard/api-keys` sau khi xác thực email.

```bash
curl -X POST http://localhost:4000/api/v1/convert/compress-pdf \
  -H "X-API-Key: sp_live_..." \
  -F "file=@document.pdf"
```

## Team workspace

Gói Business có thể tạo team tại `/dashboard/teams`, mời thành viên qua email hoặc link local khi chưa cấu hình SMTP.
Khi chuyển đổi tài liệu, người dùng có thể chọn workspace team để dùng quota của team owner.

## Monitoring

Điền `SENTRY_DSN` cho backend/worker và `NEXT_PUBLIC_SENTRY_DSN` cho frontend nếu muốn gửi lỗi lên Sentry.
`/health/ready` kiểm tra database, Redis và storage để dùng cho uptime check.

## Supabase

Đổi `STORAGE_DRIVER=supabase`, điền `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` và tạo private bucket `documents`. Với Supabase PostgreSQL, thay `DATABASE_URL` bằng connection string của project.

## PayOS

Điền `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` từ kênh thanh toán PayOS. Thiết lập webhook public:

```text
https://api.scanpdf.vn/api/payments/webhook
```

Webhook được xác minh chữ ký và xử lý idempotent trước khi kích hoạt subscription 30 ngày.

Khi chạy local, trang QR chủ động đồng bộ trạng thái trực tiếp từ PayOS nên vẫn kích hoạt gói sau khi thanh toán. Để nhận webhook, dùng một URL public (production hoặc tunnel) và gọi bằng tài khoản ADMIN:

```http
POST /api/payments/webhook/confirm
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{"webhookUrl":"https://api.scanpdf.vn/api/payments/webhook"}
```

## Google và GitHub OAuth

Điền `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

Callback local:

```text
http://localhost:4000/api/auth/google/callback
http://localhost:4000/api/auth/github/callback
```

Callback production:

```text
https://api.scanpdf.vn/api/auth/google/callback
https://api.scanpdf.vn/api/auth/github/callback
```

## Production

- Frontend: import repository vào Vercel, root directory `frontend`.
- Backend/worker: deploy hai process từ cùng Dockerfile; command lần lượt là `node dist/src/server.js` và `node dist/src/workers/conversion.worker.js`.
- Không chạy LibreOffice trực tiếp trên Vercel/serverless.
- Đổi `JWT_SECRET`, CORS URL và giữ Supabase service-role key chỉ ở backend.

## Mobile App

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api npm run mobile:dev
```

Với máy thật, thay IP trên bằng địa chỉ LAN của máy chạy backend. Mã nguồn và
hướng dẫn chi tiết nằm tại `apps/mobile`.

## Chrome Extension

```bash
npm run extension:build
```

Mở `chrome://extensions`, bật Developer mode và Load unpacked thư mục
`apps/chrome-extension/dist`. Ở production, thêm origin
`chrome-extension://<extension-id>` vào `CORS_ORIGINS`.

## Desktop App

```bash
npm run desktop:dev
npm run desktop:build
```

Bản đóng gói local nằm trong `apps/desktop/release`. Phát hành công khai cần
chứng chỉ code signing/notarization tương ứng của Apple hoặc Microsoft.

## Phần còn lại theo roadmap

- Chữ ký số pháp lý bằng chứng thư số/CA. Hiện tại ScanPDF chỉ hỗ trợ chữ ký trực quan trên PDF.
