import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function AddPageNumbersPage() {
  return (
    <ToolWorkspace title="Đánh số trang PDF">
      <ToolUploader
        tool="add-page-numbers"
        accept=".pdf"
        fields={[{
          name: "position",
          label: "Vị trí số trang",
          type: "select",
          defaultValue: "bottom-center",
          options: [
            { label: "Giữa phía dưới", value: "bottom-center" },
            { label: "Phải phía dưới", value: "bottom-right" },
            { label: "Phải phía trên", value: "top-right" },
          ],
        }]}
      />
    </ToolWorkspace>
  );
}
