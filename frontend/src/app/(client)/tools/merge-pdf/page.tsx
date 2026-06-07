import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function MergePdfPage() {
  return (
    <ToolWorkspace title="Ghép PDF">
      <ToolUploader tool="merge-pdf" accept=".pdf" multiple minimumFiles={2} />
    </ToolWorkspace>
  );
}
