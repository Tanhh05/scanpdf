import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function AutoSubtitleVideoPage() {
  return (
    <ToolWorkspace title="Auto Subtitle Video">
      <ToolUploader
        tool="auto-subtitle-video"
        accept=".mp4,.mov,.mkv,.avi,.webm"
        fields={[
          {
            name: "translateTo",
            label: "Ngôn ngữ subtitle đầu ra",
            type: "select",
            defaultValue: "none",
            options: [
              { label: "Giữ nguyên ngôn ngữ gốc", value: "none" },
              { label: "Dịch sang tiếng Việt", value: "vi" },
              { label: "Dịch sang tiếng Anh", value: "en" },
            ],
          },
        ]}
      />
    </ToolWorkspace>
  );
}
