import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function ExtractAudioPage() {
  return (
    <ToolWorkspace title="Extract Audio">
      <ToolUploader tool="extract-audio" accept=".mp4,.mov,.mkv,.avi,.webm" />
    </ToolWorkspace>
  );
}
