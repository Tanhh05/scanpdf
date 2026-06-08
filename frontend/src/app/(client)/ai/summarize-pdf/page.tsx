import { AiPdfTool } from "@/components/client/ai-pdf-tool";

export default function SummarizePdfPage() {
  return (
    <div className="bg-[#f7f8fc] py-10 sm:py-14">
      <div className="container-page">
        <AiPdfTool
          mode="summary"
          title="Tóm tắt PDF"
          description="Tạo bản tóm tắt tiếng Việt có cấu trúc, gồm nội dung chính, ý quan trọng và các điểm cần chú ý trong tài liệu."
        />
      </div>
    </div>
  );
}
