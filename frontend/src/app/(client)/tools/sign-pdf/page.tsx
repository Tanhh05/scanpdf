import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function SignPdfPage() {
  return (
    <ToolWorkspace title="Ký PDF">
      <ToolUploader
        tool="sign-pdf"
        accept=".pdf"
        fields={[
          {
            name: "signer",
            label: "Tên người ký",
            placeholder: "Nguyễn Văn A",
            help: "Chữ ký trực quan, không thay thế chữ ký số có chứng thư.",
          },
          {
            name: "position",
            label: "Vị trí",
            type: "select",
            defaultValue: "bottom-right",
            options: [
              { label: "Góc dưới bên phải", value: "bottom-right" },
              { label: "Góc dưới bên trái", value: "bottom-left" },
            ],
          },
        ]}
      />
    </ToolWorkspace>
  );
}
