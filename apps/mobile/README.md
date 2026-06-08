# ScanPDF Mobile

Ứng dụng Expo cho iOS và Android.

```bash
npm run mobile:dev
```

Máy thật không truy cập được `localhost` của máy phát triển. Đặt địa chỉ IP
LAN trước khi chạy:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api npm run mobile:dev
```

Ứng dụng hỗ trợ đăng nhập/2FA, upload tài liệu, theo dõi chuyển đổi, lịch sử,
tải/chia sẻ kết quả và dark mode theo hệ điều hành.
