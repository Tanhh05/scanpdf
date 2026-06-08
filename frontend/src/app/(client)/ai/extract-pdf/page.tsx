import { AiPdfTool } from "@/components/client/ai-pdf-tool";

export default function ExtractPdfPage() {
  return (
    <div className="bg-[#f7f8fc] py-10 sm:py-14">
      <div className="container-page">
        <AiPdfTool
          mode="extract"
          title="Trích xuất thông tin PDF"
          description="AI đọc tài liệu và lấy ra các thông tin quan trọng như bên liên quan, ngày tháng, số tiền, mã số và điều khoản."
        />
      </div>
    </div>
  );
}
