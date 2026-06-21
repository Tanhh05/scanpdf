import { ComingSoonPage } from "@/components/common/coming-soon-page";

export default function DashboardNotificationsPage() {
  return (
    <ComingSoonPage
      title="Thông báo"
      description="Khu vực thông báo sẽ hiển thị kết quả chuyển đổi, thanh toán, lời mời team và cảnh báo hệ thống."
      backHref="/dashboard"
      backLabel="Về tổng quan"
    />
  );
}
