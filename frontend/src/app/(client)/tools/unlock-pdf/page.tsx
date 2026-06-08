import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function UnlockPdfPage() {
  return (
    <ToolWorkspace title="Mở khóa PDF">
      <ToolUploader
        tool="unlock-pdf"
        accept=".pdf"
        fields={[{
          name: "password",
          label: "Mật khẩu hiện tại",
          type: "password",
          placeholder: "Nhập mật khẩu của PDF",
        }]}
      />
    </ToolWorkspace>
  );
}
