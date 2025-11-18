import { useState } from "react";
import ImportProgressReport from "../components/ImportProgressReport";
import type { FlowchartResult } from "../types/flowchartResult";
import Flowchart from "../components/Flowchart";

export default function Dashboard() {
  const [flowData, setFlowData] = useState<FlowchartResult | null>(null);

  return (
    <div className="p-6 space-y-6">
      <ImportProgressReport onFlowchartReady={setFlowData} />

      {flowData ? (
        <Flowchart flowData={flowData} />
      ) : (
        <div className="text-center text-gray-600 pt-10">
          Upload your academic progress report to generate your flowchart.
        </div>
      )}
    </div>
  );
}
