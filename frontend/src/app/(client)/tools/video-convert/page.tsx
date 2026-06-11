import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function VideoConvertPage() {
  return (
    <ToolWorkspace title="Video Convert">
      <ToolUploader tool="video-convert" accept=".mp4,.mov,.mkv,.avi,.webm" />
    </ToolWorkspace>
  );
}
