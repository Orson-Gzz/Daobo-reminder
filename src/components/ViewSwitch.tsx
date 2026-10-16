import { setView, useStore } from '../store';
import type { View } from '../types';

const VIEWS: { id: View; label: string }[] = [
  { id: 'list', label: 'Reminders' },
  { id: 'calendar', label: 'Calendar' },
];

/** Title-style switch between the list and the calendar (C toggles). */
export function ViewSwitch() {
  const view = useStore((s) => s.settings.view);
  return (
    <div className="view-switch" role="group" aria-label="View">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={view === v.id}
          title={`${v.label} (C)`}
          onClick={() => setView(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
