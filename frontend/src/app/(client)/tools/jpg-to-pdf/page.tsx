import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function JpgToPdfPage() {
  return (
    <ToolWorkspace title="JPG sang PDF">
      <ToolUploader tool="jpg-to-pdf" accept=".jpg,.jpeg,.png" multiple />
    </ToolWorkspace>
  );
}
