import { useState } from "react";
import axios from "axios";
import { FileUpload } from "primereact/fileupload";
import type { FileUploadSelectEvent } from "primereact/fileupload";
import type { FlowchartResult } from "../types/flowchartResult";

export default function ImportProgressReport({
  onFlowchartReady,
}: {
  onFlowchartReady: (data: FlowchartResult) => void;
}) {
  const [loading, setLoading] = useState(false);

  // Called when the user selects a file
  const onSelect = async (e: FileUploadSelectEvent) => {
    const file = e.files?.[0];
    if (!file) return;

    setLoading(true);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await axios.post(
        "http://localhost:8080/api/progressReport/flowchart",
        form
      );

      onFlowchartReady(res.data);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="p-4 w-full flex justify-center">
      <div className="w-full max-w-xl">
        <FileUpload
          name="file"
          accept=".xlsx"
          mode="basic"
          auto
          chooseLabel={loading ? "Processing..." : "Upload Progress Report"}
          disabled={loading}
          customUpload
          uploadHandler={() => {}} // unused because we use onSelect
          onSelect={onSelect}
          className="w-full"
        />
      </div>
    </div>
  );
}
