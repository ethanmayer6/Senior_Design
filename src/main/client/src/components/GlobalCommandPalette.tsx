import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FocusSafeModal from './FocusSafeModal';

type CommandItem = {
  id: string;
  label: string;
  description: string;
  to: string;
  shortcut: string;
};

const COMMANDS: CommandItem[] = [
  { id: 'home', label: 'CourseFlow Home', description: 'Open home dashboard links', to: '/courseflow', shortcut: 'g h' },
  { id: 'dashboard', label: 'Flowchart Dashboard', description: 'Open flowchart planning board', to: '/dashboard', shortcut: 'g d' },
  { id: 'catalog', label: 'Course Catalog', description: 'Browse and filter courses', to: '/catalog', shortcut: 'g c' },
  { id: 'majors', label: 'Majors Browse', description: 'Inspect major requirements', to: '/majors', shortcut: 'g m' },
  { id: 'scheduler', label: 'Smart Scheduler', description: 'Generate schedule options', to: '/smart-scheduler', shortcut: 'g s' },
  { id: 'games', label: 'Games', description: 'Play the daily puzzle challenge', to: '/games', shortcut: 'g g' },
  { id: 'search', label: 'Student Search', description: 'Find other student accounts', to: '/student-search', shortcut: 'g f' },
  { id: 'profile', label: 'Profile', description: 'Open your profile page', to: '/profile', shortcut: 'g p' },
  { id: 'settings', label: 'Settings', description: 'Open accessibility/theme settings', to: '/settings', shortcut: 'g t' },
];

function isTextEntryTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    element.isContentEditable
  );
}

export default function GlobalCommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingPrefix, setPendingPrefix] = useState<string | null>(null);

  const filteredCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COMMANDS;
    return COMMANDS.filter((command) =>
      command.label.toLowerCase().includes(normalized)
      || command.description.toLowerCase().includes(normalized)
      || command.shortcut.toLowerCase().includes(normalized)
    );
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
        setPendingPrefix(null);
        return;
      }

      if (open || isTextEntryTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (pendingPrefix === 'g') {
        const routeByKey: Record<string, string> = {
          h: '/courseflow',
          d: '/dashboard',
          c: '/catalog',
          m: '/majors',
          s: '/smart-scheduler',
          g: '/games',
          f: '/student-search',
          p: '/profile',
          t: '/settings',
        };
        const nextRoute = routeByKey[key];
        setPendingPrefix(null);
        if (nextRoute) {
          event.preventDefault();
          navigate(nextRoute);
        }
        return;
      }

      if (key === 'g') {
        setPendingPrefix('g');
        window.setTimeout(() => setPendingPrefix((current) => (current === 'g' ? null : current)), 1200);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, open, pendingPrefix]);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const executeCommand = (command: CommandItem) => {
    setOpen(false);
    if (location.pathname !== command.to) {
      navigate(command.to);
    }
  };

  return (
    <FocusSafeModal open={open} onClose={() => setOpen(false)} title="Quick Search" maxWidthClass="max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800">Quick Search</h2>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:border-red-300 hover:bg-red-50"
          onClick={() => setOpen(false)}
        >
          Esc
        </button>
      </div>
      <div className="mt-3">
        <input
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
          placeholder="Search pages or type a shortcut (example: g d)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2">
        {filteredCommands.length === 0 ? (
          <div className="p-2 text-sm text-gray-600">No matching commands.</div>
        ) : (
          filteredCommands.map((command) => (
            <button
              key={command.id}
              type="button"
              onClick={() => executeCommand(command)}
              className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-left hover:border-red-300 hover:bg-red-50"
            >
              <div>
                <div className="text-sm font-semibold text-gray-800">{command.label}</div>
                <div className="text-xs text-gray-600">{command.description}</div>
              </div>
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                {command.shortcut}
              </span>
            </button>
          ))
        )}
      </div>
    </FocusSafeModal>
  );
}
