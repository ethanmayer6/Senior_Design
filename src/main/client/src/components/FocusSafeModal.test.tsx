import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import FocusSafeModal from './FocusSafeModal';

describe('FocusSafeModal', () => {
  it('traps focus, closes on escape, and passes an accessibility audit', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <FocusSafeModal open title="Keyboard Test" onClose={onClose}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </FocusSafeModal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Keyboard Test' });
    const firstButton = screen.getByRole('button', { name: 'First' });
    const secondButton = screen.getByRole('button', { name: 'Second' });

    expect(dialog).toBeInTheDocument();
    expect(firstButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(secondButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('restores focus to the previously focused element when it closes', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open modal';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <FocusSafeModal open title="Restore Test" onClose={() => {}}>
        <button type="button">Inside</button>
      </FocusSafeModal>,
    );

    rerender(
      <FocusSafeModal open={false} title="Restore Test" onClose={() => {}}>
        <button type="button">Inside</button>
      </FocusSafeModal>,
    );

    expect(trigger).toHaveFocus();
    document.body.removeChild(trigger);
  });
});
