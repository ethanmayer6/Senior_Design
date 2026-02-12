import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { getSavedDarkMode, setDarkMode } from '../utils/theme';

export default function Settings() {
  const [darkMode, setDarkModeState] = useState(getSavedDarkMode());

  const handleToggleDarkMode = (enabled: boolean) => {
    setDarkModeState(enabled);
    setDarkMode(enabled);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Settings</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Preferences</h1>
          </div>
          <Link to="/courseflow">
            <Button label="Back" icon="pi pi-arrow-left" outlined />
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-slate-800">Dark Mode</div>
              <div className="text-sm text-slate-600">
                Use a darker color theme across CourseFlow.
              </div>
            </div>
            <InputSwitch checked={darkMode} onChange={(e) => handleToggleDarkMode(!!e.value)} />
          </div>
        </section>
      </main>
    </div>
  );
}
