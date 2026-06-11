import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function VideoToGifPage() {
  return (
    <ToolWorkspace title="Video To GIF">
      <ToolUploader tool="video-to-gif" accept=".mp4,.mov,.mkv,.avi,.webm" />
    </ToolWorkspace>
  );
}
