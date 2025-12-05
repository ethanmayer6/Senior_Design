// src/main/client/src/components/ImportProgressReport.tsx
import { useState } from 'react';
import axios from 'axios';
import { FileUpload } from 'primereact/fileupload';
import type { FileUploadSelectEvent } from 'primereact/fileupload';

export default function ImportProgressReport({ onImported }: { onImported: () => void }) {
  const [loading, setLoading] = useState(false);

  const onSelect = async (e: FileUploadSelectEvent) => {
    const file = e.files?.[0];
    if (!file) return;

    setLoading(true);

    const form = new FormData();
    form.append('file', file);

    const token = localStorage.getItem('token');

    try {
      await axios.post('http://localhost:8080/api/progressReport/flowchart', form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      // tell parent to reload flowchart
      onImported();
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="p-4 justify-center w-full max-w-xl">
      <FileUpload
        name="file"
        accept=".xlsx"
        mode="basic"
        auto
        chooseLabel={loading ? 'Processing...' : 'Upload Progress Report'}
        disabled={loading}
        customUpload
        uploadHandler={() => {}}
        onSelect={onSelect}
        className="w-full"
      />
    </div>
  );
}
