import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function RotatePdfPage() {
  return (
    <ToolWorkspace title="Xoay PDF">
      <ToolUploader
        tool="rotate-pdf"
        accept=".pdf"
        fields={[{
          name: "angle",
          label: "Góc xoay",
          type: "select",
          defaultValue: "90",
          options: [
            { label: "90 độ", value: "90" },
            { label: "180 độ", value: "180" },
            { label: "270 độ", value: "270" },
          ],
        }]}
      />
    </ToolWorkspace>
  );
}
