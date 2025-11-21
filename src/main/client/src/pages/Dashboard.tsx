// Dashboard.tsx
import { useEffect, useState } from 'react';
import ImportProgressReport from '../components/ImportProgressReport';
import Flowchart from '../components/Flowchart';
import { getUserFlowchart } from '../api/flowchartApi';
import type { Flowchart as FlowchartType } from '../api/flowchartApi';
import Header from '../components/Header';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';

export default function Dashboard() {
  const [flowchart, setFlowchart] = useState<FlowchartType | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved flowchart when dashboard loads
  useEffect(() => {
    async function load() {
      setLoading(true);
      const fc = await getUserFlowchart();
      setFlowchart(fc);
      setLoading(false);
    }
    load();
  }, []);

  // After import completes, reload flowchart from backend
  const handleImportComplete = async () => {
    setLoading(true);
    const fc = await getUserFlowchart();
    setFlowchart(fc);
    setLoading(false);
  };

  const handleDeleteFlowchart = async () => {
    if (!flowchart) return;
    try {
      await fetch(`http://localhost:8080/api/flowchart/delete/${flowchart.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setFlowchart(null);
    } catch (err) {
      console.error('Failed to delete flowchart:', err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Logo Section */}
      <Header></Header>
      <div className="flex w-full justify-between pt-24 p-6 space-y-6">
        <div>
          <ImportProgressReport onImported={handleImportComplete} />
          <div className="p-4 w-full">
            <Button
              className="w-full text-center"
              label="Delete Flowchart"
              onClick={handleDeleteFlowchart}
            ></Button>
          </div>
          {loading && (
            <div className="flex justify-center py-10">
              <ProgressSpinner style={{ width: '50px', height: '50px' }} />
            </div>
          )}
        </div>

        <div>
          {flowchart ? (
            <div className="flex justify-end items-start">
              <Flowchart flowchart={flowchart} />
            </div>
          ) : (
            <div className="text-center text-gray-600 pt-10">
              Upload a progress report to generate your flowchart.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
