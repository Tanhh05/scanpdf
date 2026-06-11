import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function VideoCompressPage() {
  return (
    <ToolWorkspace title="Video Compress">
      <ToolUploader tool="video-compress" accept=".mp4,.mov,.mkv,.avi,.webm" />
    </ToolWorkspace>
  );
}
