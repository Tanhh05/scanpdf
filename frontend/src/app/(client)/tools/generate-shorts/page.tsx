import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function GenerateShortsPage() {
  return (
    <ToolWorkspace title="Generate Shorts">
      <ToolUploader tool="generate-shorts" accept=".mp4,.mov,.mkv,.avi,.webm" />
    </ToolWorkspace>
  );
}
