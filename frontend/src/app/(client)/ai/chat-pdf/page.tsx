import { AiPdfTool } from "@/components/client/ai-pdf-tool";

export default function ChatPdfPage() {
  return (
    <div className="bg-[#f7f8fc] py-10 sm:py-14">
      <div className="container-page">
        <AiPdfTool
          mode="chat"
          title="Chat PDF AI"
          description="Đặt câu hỏi và nhận câu trả lời dựa trên nội dung PDF. Phù hợp cho hợp đồng, báo cáo, giáo trình và tài liệu dài."
        />
      </div>
    </div>
  );
}
