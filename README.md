# ScanPDF

Nền tảng SaaS chuyển đổi tài liệu dùng Next.js, Express, PostgreSQL, Redis/BullMQ và LibreOffice.

## Chức năng đã triển khai

- Đăng ký, đăng nhập JWT và phân quyền USER/ADMIN.
- Đăng nhập Google OpenID Connect và GitHub OAuth, tự liên kết tài khoản bằng email đã xác minh.
- Gói Free/Pro/Business, quota theo ngày và giới hạn dung lượng.
- Word/DOCX/ODT sang PDF bằng LibreOffice.
- PDF sang DOCX theo hướng text-first bằng `pdftotext`.
- Ghép PDF, nén PDF, JPG/PNG sang PDF và PDF sang bộ ảnh JPG đóng ZIP.
- OCR PDF tiếng Việt/Anh, tạo PDF có thể tìm kiếm nội dung.
- Upload local hoặc Supabase Storage, lịch sử, polling trạng thái và download có kiểm tra quyền.
- Queue BullMQ, worker riêng, retry và priority cho gói trả phí.
- Dashboard người dùng, gói Free/Pro và VietQR từ PayOS với webhook tự động.
- Admin dashboard, quản lý người dùng, thanh toán và thống kê 30 ngày.
- Docker Compose và GitHub Actions.

## Chạy local bằng npm

Yêu cầu: Node.js 20+, PostgreSQL, Redis, LibreOffice và Poppler.

Trên macOS:

```bash
brew install postgresql@17 redis poppler ghostscript tesseract-lang
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

Worker dùng `soffice`, Poppler, Ghostscript và Tesseract để xử lý tài liệu.

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

## Phần còn lại theo roadmap

Email reset password, Chat PDF AI, ký điện tử và cleanup file hết hạn vẫn là phần roadmap sau MVP.
