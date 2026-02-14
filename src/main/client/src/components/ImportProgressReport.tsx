// src/main/client/src/components/ImportProgressReport.tsx
import { useState } from 'react';
import { FileUpload } from 'primereact/fileupload';
import type { FileUploadSelectEvent } from 'primereact/fileupload';
import api from '../api/axiosClient';

export default function ImportProgressReport({ onImported }: { onImported: () => void }) {
  const [loading, setLoading] = useState(false);

  const onSelect = async (e: FileUploadSelectEvent) => {
    const file = e.files?.[0];
    if (!file) return;

    setLoading(true);

    const form = new FormData();
    form.append('file', file);

    try {
      await api.post('/progressReport/flowchart', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // tell parent to reload flowchart
      onImported();
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="w-full">
      <FileUpload
        name="file"
        accept=".xlsx"
        mode="basic"
        auto
        chooseLabel={loading ? 'Processing...' : 'Upload Progress Report'}
        chooseOptions={{ className: 'w-full text-center' }}
        disabled={loading}
        customUpload
        uploadHandler={() => {}}
        onSelect={onSelect}
        className="w-full"
      />
    </div>
  );
}
