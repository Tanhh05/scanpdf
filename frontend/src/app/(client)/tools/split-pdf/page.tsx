import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function SplitPdfPage() {
  return (
    <ToolWorkspace title="Tách PDF">
      <ToolUploader tool="split-pdf" accept=".pdf" />
      <p className="mt-3 text-center text-sm text-slate-500">Mỗi trang PDF sẽ được tách thành file riêng và đóng gói ZIP.</p>
    </ToolWorkspace>
  );
}
