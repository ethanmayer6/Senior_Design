export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export type AppNotificationInput = {
  level: NotificationLevel;
  title: string;
  message: string;
  actionLabel?: string;
  actionPath?: string;
  ttlMs?: number;
};

export type AppNotificationEventPayload = AppNotificationInput & {
  id: string;
};

const EVENT_NAME = 'courseflow:notify';

export function publishAppNotification(input: AppNotificationInput): void {
  const payload: AppNotificationEventPayload = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  window.dispatchEvent(new CustomEvent<AppNotificationEventPayload>(EVENT_NAME, { detail: payload }));
}

export function subscribeToAppNotifications(
  handler: (payload: AppNotificationEventPayload) => void
): () => void {
  const wrapped = (event: Event) => {
    const custom = event as CustomEvent<AppNotificationEventPayload>;
    if (!custom.detail) return;
    handler(custom.detail);
  };
  window.addEventListener(EVENT_NAME, wrapped);
  return () => window.removeEventListener(EVENT_NAME, wrapped);
}

