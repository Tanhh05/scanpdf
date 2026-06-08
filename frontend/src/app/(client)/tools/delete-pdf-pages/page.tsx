import { ToolUploader } from "@/components/client/tool-uploader";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function DeletePdfPagesPage() {
  return (
    <ToolWorkspace title="Xóa trang PDF">
      <ToolUploader
        tool="delete-pdf-pages"
        accept=".pdf"
        fields={[{
          name: "pages",
          label: "Trang cần xóa",
          placeholder: "Ví dụ: 1,3,5-7",
          help: "Nhập số trang hoặc khoảng trang, phân tách bằng dấu phẩy.",
        }]}
      />
    </ToolWorkspace>
  );
}
