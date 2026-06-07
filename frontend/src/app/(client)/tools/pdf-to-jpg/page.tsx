import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function PdfToJpgPage() {
  return (
    <ToolWorkspace title="PDF sang JPG">
      <ToolUploader tool="pdf-to-jpg" accept=".pdf" />
      <p className="mt-3 text-center text-sm text-slate-500">Mỗi trang được xuất thành JPG và đóng gói trong một file ZIP.</p>
    </ToolWorkspace>
  );
}
