import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import {
  getUserPreferences,
  updateUserPreferences,
  type UserPreferences,
} from '../api/usersApi';
import { getSavedThemePreferences, setThemePreferences } from '../utils/theme';

const themeOptions = [
  { label: 'Default', value: 'default' },
  { label: 'Ocean', value: 'ocean' },
  { label: 'Forest', value: 'forest' },
];

const fontScaleOptions = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

export default function Settings() {
  const [prefs, setPrefs] = useState<UserPreferences>(getSavedThemePreferences());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true);
      setError(null);
      try {
        const serverPrefs = await getUserPreferences();
        setPrefs(serverPrefs);
        setThemePreferences(serverPrefs);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load settings. Using local settings.');
        const local = getSavedThemePreferences();
        setPrefs(local);
        setThemePreferences(local);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const updateLocal = (next: UserPreferences) => {
    setPrefs(next);
    setThemePreferences(next);
    setSuccess(null);
    setError(null);
  };

  const savePreferences = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const persisted = await updateUserPreferences(prefs);
      setPrefs(persisted);
      setThemePreferences(persisted);
      setSuccess('Settings saved.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
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

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {loading ? (
            <div className="text-sm text-slate-600">Loading settings...</div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-800">Dark Mode</div>
                  <div className="text-sm text-slate-600">Use a darker color theme across CourseFlow.</div>
                </div>
                <InputSwitch
                  checked={prefs.darkMode}
                  onChange={(e) => updateLocal({ ...prefs, darkMode: !!e.value })}
                />
              </div>

              <div>
                <div className="mb-1 text-base font-semibold text-slate-800">Theme Preset</div>
                <div className="mb-2 text-sm text-slate-600">Choose an accent style for the app UI.</div>
                <Dropdown
                  className="w-full sm:w-72"
                  value={prefs.themePreset}
                  options={themeOptions}
                  onChange={(e) => updateLocal({ ...prefs, themePreset: e.value })}
                />
              </div>

              <div>
                <div className="mb-1 text-base font-semibold text-slate-800">Font Size</div>
                <div className="mb-2 text-sm text-slate-600">Adjust global text size for readability.</div>
                <Dropdown
                  className="w-full sm:w-72"
                  value={prefs.fontScale}
                  options={fontScaleOptions}
                  onChange={(e) => updateLocal({ ...prefs, fontScale: e.value })}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-800">Reduced Motion</div>
                  <div className="text-sm text-slate-600">
                    Minimize animations and transitions across the app.
                  </div>
                </div>
                <InputSwitch
                  checked={prefs.reducedMotion}
                  onChange={(e) => updateLocal({ ...prefs, reducedMotion: !!e.value })}
                />
              </div>

              <div className="pt-2">
                <Button
                  label={saving ? 'Saving...' : 'Save Settings'}
                  icon="pi pi-save"
                  onClick={savePreferences}
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
