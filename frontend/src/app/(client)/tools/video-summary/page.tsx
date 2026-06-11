import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function VideoSummaryPage() {
  return (
    <ToolWorkspace title="AI Summary Video">
      <ToolUploader tool="video-summary" accept=".mp4,.mov,.mkv,.avi,.webm" />
    </ToolWorkspace>
  );
}
