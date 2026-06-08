import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function ProtectPdfPage() {
  return (
    <ToolWorkspace title="Khóa PDF">
      <ToolUploader
        tool="protect-pdf"
        accept=".pdf"
        fields={[{
          name: "password",
          label: "Mật khẩu bảo vệ",
          type: "password",
          placeholder: "Từ 4 đến 64 ký tự",
          help: "Bạn cần mật khẩu này để mở tài liệu sau khi tải xuống.",
        }]}
      />
    </ToolWorkspace>
  );
}
