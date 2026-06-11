import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function VideoMergePage() {
  return (
    <ToolWorkspace title="Video Merge">
      <ToolUploader tool="video-merge" accept=".mp4,.mov,.mkv,.avi,.webm" multiple minimumFiles={2} />
    </ToolWorkspace>
  );
}
