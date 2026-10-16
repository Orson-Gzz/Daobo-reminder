import { useEffect } from 'react';
import { XIcon } from '../icons';
import { useUI } from '../store';
import { IconButton } from './ui';

const DURATION_MS = 5000;

export function Toast() {
  const toast = useUI((s) => s.toast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      if (useUI.getState().toast?.id === toast.id) useUI.setState({ toast: null });
    }, DURATION_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const dismiss = () => useUI.setState({ toast: null });

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          <span className="toast-message">{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              className="toast-undo"
              onClick={() => {
                toast.undo?.();
                dismiss();
              }}
            >
              Undo
            </button>
          )}
          <IconButton label="Dismiss" icon={XIcon} size={14} onClick={dismiss} />
        </div>
      )}
    </div>
  );
}
