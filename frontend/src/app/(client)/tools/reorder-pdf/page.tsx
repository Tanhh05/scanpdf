import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function ReorderPdfPage() {
  return (
    <ToolWorkspace title="Sắp xếp trang PDF">
      <ToolUploader
        tool="reorder-pdf"
        accept=".pdf"
        fields={[{
          name: "pages",
          label: "Thứ tự trang mới",
          placeholder: "Ví dụ PDF có 4 trang: 4,1,2,3",
          help: "Nhập đủ tất cả số trang, mỗi trang một lần và phân tách bằng dấu phẩy.",
        }]}
      />
    </ToolWorkspace>
  );
}
