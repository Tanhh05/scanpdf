import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function CompressPdfPage() {
  return (
    <ToolWorkspace title="Nén PDF">
      <ToolUploader tool="compress-pdf" accept=".pdf" />
    </ToolWorkspace>
  );
}
