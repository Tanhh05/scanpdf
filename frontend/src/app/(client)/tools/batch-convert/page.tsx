import { BatchConverter } from "@/components/client/batch-converter";
import { ToolWorkspace } from "@/components/client/tool-workspace";

export default function BatchConvertPage() {
  return (
    <ToolWorkspace title="Batch convert">
      <BatchConverter />
    </ToolWorkspace>
  );
}
