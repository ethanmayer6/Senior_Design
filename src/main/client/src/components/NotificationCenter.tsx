import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeToAppNotifications,
  type AppNotificationEventPayload,
} from '../utils/notifications';

type NotificationItem = AppNotificationEventPayload;

const levelStyles: Record<NotificationItem['level'], string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export default function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToAppNotifications((payload) => {
      setItems((prev) => [payload, ...prev].slice(0, 5));
      const ttl = payload.ttlMs ?? 10000;
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== payload.id));
      }, ttl);
    });
    return unsubscribe;
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[9999] flex w-[22rem] max-w-[92vw] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto rounded-lg border px-3 py-2 shadow-sm ${levelStyles[item.level]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="mt-1 text-xs">{item.message}</div>
            </div>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
              className="text-xs font-semibold opacity-80 hover:opacity-100"
            >
              Close
            </button>
          </div>
          {item.actionLabel && item.actionPath && (
            <button
              type="button"
              onClick={() => {
                setItems((prev) => prev.filter((x) => x.id !== item.id));
                navigate(item.actionPath!);
              }}
              className="mt-2 rounded border border-current px-2 py-1 text-xs font-semibold"
            >
              {item.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

