import type { Metadata } from "next";
import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export const metadata: Metadata = {
  title: "AI Remove Watermark Image - Xóa logo, chữ, watermark khỏi ảnh",
  description: "Tải ảnh lên để xóa logo, chữ đè và watermark, đồng thời tái tạo nền tự nhiên.",
};

export default function RemoveWatermarkImagePage() {
  return (
    <ToolWorkspace title="AI Remove Watermark Ảnh">
      <ToolUploader
        tool="remove-watermark-image"
        accept=".jpg,.jpeg,.png,.webp"
        fields={[
          {
            name: "mode",
            label: "Loại watermark",
            type: "select",
            defaultValue: "auto",
            options: [
              { label: "Tự động nhận diện", value: "auto" },
              { label: "Logo / nhãn", value: "logo" },
              { label: "Chữ đè / caption", value: "text" },
              { label: "Watermark trong suốt", value: "watermark" },
            ],
            help: "Chọn đúng loại overlay để AI giữ nền phía sau ổn định hơn.",
          },
          {
            name: "details",
            label: "Mô tả thêm",
            placeholder: "Ví dụ: watermark ở góc phải dưới, giữ nguyên khuôn mặt và chữ trên biển hiệu",
            help: "Không bắt buộc. Dùng khi ảnh có nhiều lớp chữ hoặc vùng cần giữ nguyên.",
          },
        ]}
      />
    </ToolWorkspace>
  );
}
