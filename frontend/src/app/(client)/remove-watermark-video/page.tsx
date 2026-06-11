import type { Metadata } from "next";
import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export const metadata: Metadata = {
  title: "Remove Watermark Video - Xóa watermark TikTok, logo góc, subtitle cứng",
  description: "Tải video lên để xử lý watermark góc, watermark kiểu TikTok và subtitle cứng bằng preset tối ưu.",
};

export default function RemoveWatermarkVideoPage() {
  return (
    <ToolWorkspace title="Remove Watermark Video">
      <ToolUploader
        tool="remove-watermark-video"
        accept=".mp4,.mov,.mkv,.avi,.webm"
        fields={[
          {
            name: "preset",
            label: "Preset vùng watermark",
            type: "select",
            defaultValue: "tiktok-dual-corner",
            options: [
              { label: "TikTok 2 góc", value: "tiktok-dual-corner" },
              { label: "Góc trái trên", value: "top-left" },
              { label: "Góc phải trên", value: "top-right" },
              { label: "Góc trái dưới", value: "bottom-left" },
              { label: "Góc phải dưới", value: "bottom-right" },
              { label: "Giữa phía dưới", value: "bottom-center" },
            ],
            help: "Preset TikTok áp dụng đồng thời 2 vùng thường gặp của watermark.",
          },
          {
            name: "watermarkWidthPercent",
            label: "Độ rộng vùng xóa (%)",
            defaultValue: "18",
            placeholder: "18",
            help: "Tăng giá trị này nếu logo hoặc watermark chiếm vùng rộng hơn.",
          },
          {
            name: "watermarkHeightPercent",
            label: "Độ cao vùng xóa (%)",
            defaultValue: "12",
            placeholder: "12",
            help: "Dùng cho watermark góc và logo cố định trong video.",
          },
          {
            name: "subtitleStripPercent",
            label: "Dải subtitle cứng ở đáy (%)",
            defaultValue: "0",
            placeholder: "0",
            help: "Nhập 10-18 nếu video có subtitle cứng ở mép dưới. Để 0 nếu không dùng.",
          },
        ]}
      />
    </ToolWorkspace>
  );
}
