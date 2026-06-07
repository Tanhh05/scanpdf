import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function PdfToWordPage() {
  return (
    <ToolWorkspace title="PDF sang Word">
      <ToolUploader tool="pdf-to-word" accept=".pdf" />
      <p className="mt-4 text-center text-sm text-slate-500">
        Bản MVP ưu tiên nội dung văn bản; PDF scan cần OCR ở phiên bản sau.
      </p>
    </ToolWorkspace>
  );
}
