import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function WatermarkPdfPage() {
  return (
    <ToolWorkspace title="Thêm watermark PDF">
      <ToolUploader
        tool="watermark-pdf"
        accept=".pdf"
        fields={[{
          name: "text",
          label: "Nội dung watermark",
          placeholder: "ScanPDF",
          defaultValue: "ScanPDF",
        }]}
      />
    </ToolWorkspace>
  );
}
