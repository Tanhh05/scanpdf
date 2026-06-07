import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function WordToPdfPage() {
  return (
    <ToolWorkspace title="Word sang PDF">
      <ToolUploader tool="word-to-pdf" accept=".doc,.docx,.odt" />
    </ToolWorkspace>
  );
}
