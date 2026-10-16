import { useEffect, useRef, type ReactNode } from 'react';
import { showToast, useStore, useUI } from '../store';

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);
  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

const SHORTCUTS: [string[], string][] = [
  [['C'], 'Reminders / Calendar'],
  [['N'], 'New reminder'],
  [['/'], 'Search'],
  [['1', '2', '3'], 'Switch section'],
  [['← →', '↑ ↓'], 'Calendar: change day / week'],
  [['[', ']'], 'Calendar: change month'],
  [['T'], 'Calendar: today'],
  [['J', 'K'], 'Select next / previous'],
  [['Enter'], 'Open / close details'],
  [['X'], 'Complete / restore'],
  [['W'], 'Toggle Awaiting Reply'],
  [['⌥', '↑ ↓'], 'List: reorder within a zone (manual sort)'],
  [['Del'], 'Delete'],
  [['⌘', 'Z'], 'Undo'],
  [['Esc'], 'Close / deselect'],
];

export function ShortcutsHelp() {
  const open = useUI((s) => s.helpOpen);
  if (!open) return null;
  const close = () => useUI.setState({ helpOpen: false });
  return (
    <Dialog title="Keyboard shortcuts" onClose={close}>
      <dl className="shortcuts">
        {SHORTCUTS.map(([keys, label]) => (
          <div key={label}>
            <dt>
              {keys.map((k) => (
                <kbd key={k}>{k}</kbd>
              ))}
            </dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
      <div className="dialog-actions">
        <button type="button" className="btn primary" onClick={close}>
          Done
        </button>
      </div>
    </Dialog>
  );
}

export function ImportDialog() {
  const pending = useUI((s) => s.pendingImport);
  const currentCount = useStore((s) => s.reminders.length);
  if (!pending) return null;

  const close = () => useUI.setState({ pendingImport: null });
  const run = (mode: 'merge' | 'replace') => {
    const undo = useStore.getState().importReminders(pending, mode);
    close();
    showToast(`Imported ${pending.length} reminder${pending.length === 1 ? '' : 's'}`, undo);
  };

  return (
    <Dialog title="Import backup" onClose={close}>
      <p className="dialog-text">
        Found {pending.length} reminder{pending.length === 1 ? '' : 's'}. Merge adds them to your current{' '}
        {currentCount} and updates matching ones. Replace swaps everything for the backup.
      </p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={close}>
          Cancel
        </button>
        <button type="button" className="btn" onClick={() => run('replace')}>
          Replace
        </button>
        <button type="button" className="btn primary" onClick={() => run('merge')}>
          Merge
        </button>
      </div>
    </Dialog>
  );
}
