import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function VideoTrimPage() {
  return (
    <ToolWorkspace title="Video Trim">
      <ToolUploader
        tool="video-trim"
        accept=".mp4,.mov,.mkv,.avi,.webm"
        fields={[
          { name: "startSeconds", label: "Bắt đầu (giây)", defaultValue: "0", placeholder: "0" },
          { name: "endSeconds", label: "Kết thúc (giây)", defaultValue: "15", placeholder: "15" },
        ]}
      />
    </ToolWorkspace>
  );
}
