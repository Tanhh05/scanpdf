import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function OcrPdfPage() {
  return (
    <ToolWorkspace title="PDF OCR">
      <ToolUploader tool="ocr-pdf" accept=".pdf" />
      <p className="mt-3 text-center text-sm text-slate-500">Nhận dạng tiếng Việt và tiếng Anh, tạo PDF có thể tìm kiếm nội dung.</p>
    </ToolWorkspace>
  );
}
