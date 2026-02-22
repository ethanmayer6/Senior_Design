import { type ReactNode, useEffect, useRef } from 'react';

interface FocusSafeModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function FocusSafeModal({
  open,
  title,
  onClose,
  children,
  maxWidthClass = 'max-w-xl',
}: FocusSafeModalProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousActive = document.activeElement as HTMLElement | null;
    const content = contentRef.current;
    const focusables = content
      ? Array.from(content.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      : [];
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      content?.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const currentFocusables = content
        ? Array.from(content.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        : [];
      if (currentFocusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previousActive?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={onClose}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={`w-full ${maxWidthClass} rounded-2xl border border-gray-200 bg-white p-4 shadow-xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
