// src/main/client/src/components/ImportProgressReport.tsx
import { useState } from 'react';
import { FileUpload } from 'primereact/fileupload';
import type { FileUploadSelectEvent } from 'primereact/fileupload';
import api from '../api/axiosClient';
import { publishAppNotification } from '../utils/notifications';

interface ImportProgressReportProps {
  onImported: () => void;
  disabled?: boolean;
}

export default function ImportProgressReport({ onImported, disabled = false }: ImportProgressReportProps) {
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
      publishAppNotification({
        level: 'error',
        title: 'Progress Report Import Failed',
        message: 'The upload could not be processed. Check the Excel format and try again.',
      });
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
        disabled={loading || disabled}
        customUpload
        uploadHandler={() => {}}
        onSelect={onSelect}
        className="w-full"
      />
    </div>
  );
}
