# ScanPDF Desktop

Chạy ứng dụng:

```bash
npm run desktop:dev
```

Tạo bản đóng gói thử nghiệm:

```bash
npm run desktop:build
```

Tạo bộ cài cho hệ điều hành hiện tại:

```bash
npm run dist -w @scanpdf/desktop
```

Token đăng nhập được mã hóa bằng `safeStorage` của Electron và lưu trong thư
mục dữ liệu ứng dụng. API URL mặc định là `http://localhost:4000/api`.
