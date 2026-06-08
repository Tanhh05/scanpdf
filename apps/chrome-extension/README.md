# ScanPDF Chrome Extension

Build extension:

```bash
npm run extension:build
```

Mở `chrome://extensions`, bật **Developer mode**, chọn **Load unpacked** và
trỏ tới `apps/chrome-extension/dist`.

Extension mặc định kết nối `http://localhost:4000/api`. Có thể đổi API URL
trong nút cài đặt ở góc phải popup.
