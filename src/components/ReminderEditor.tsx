import { CornerUpLeft, Hourglass, RotateCcw, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { deleteReminder, moveReminder, restoreReminder } from '../actions';
import { DUE_PRESETS, formatTimestamp } from '../lib/dates';
import { expandZone, useStore, useUI } from '../store';
import { PRIORITY_NAME, REPEAT_LABELS, type Priority, type Reminder, type Repeat } from '../types';
import { cx, Segmented } from './ui';

const PRIORITY_OPTIONS: { value: Priority; label: string; title: string }[] = [
  { value: 0, label: 'None', title: 'No priority' },
  { value: 1, label: '!', title: PRIORITY_NAME[1] },
  { value: 2, label: '!!', title: PRIORITY_NAME[2] },
  { value: 3, label: '!!!', title: PRIORITY_NAME[3] },
];

export function ReminderEditor({ reminder: r }: { reminder: Reminder }) {
  const update = (patch: Partial<Reminder>) => useStore.getState().update(r.id, patch);
  const now = useUI((s) => s.now);
  const isWaiting = r.status === 'waiting' || (r.status === 'done' && r.prevStatus === 'waiting');
  const [presetsOpen, setPresetsOpen] = useState(false);
  const presetsId = `presets-${r.id}`;
  const applyPreset = (patch: Partial<Reminder>) => {
    update(patch);
    setPresetsOpen(false);
  };
  const setPriority = (priority: Priority) => {
    update({ priority });
    // Keep the open item in view if its new zone was folded.
    if (r.status !== 'done') expandZone(r.status, priority);
  };

  return (
    <div className="editor">
      <textarea
        className="notes"
        aria-label="Notes"
        placeholder="Notes"
        rows={2}
        value={r.notes}
        onChange={(e) => update({ notes: e.target.value })}
      />

      {isWaiting && (
        <label className="field">
          <span>Waiting on</span>
          <input
            placeholder="Name, team, or company"
            value={r.waitingOn}
            onChange={(e) => update({ waitingOn: e.target.value })}
          />
        </label>
      )}

      <div className="field">
        <span>{isWaiting ? 'Follow up' : 'Due'}</span>
        <div className="due-inputs">
          <input
            type="date"
            aria-label="Due date"
            value={r.dueDate ?? ''}
            onChange={(e) => update({ dueDate: e.target.value || null })}
          />
          <input
            type="time"
            aria-label="Due time"
            value={r.dueTime ?? ''}
            disabled={!r.dueDate}
            onChange={(e) => update({ dueTime: e.target.value || null })}
          />
          <button
            type="button"
            className={cx('chip', 'presets-toggle')}
            aria-expanded={presetsOpen}
            aria-controls={presetsId}
            onClick={() => setPresetsOpen(!presetsOpen)}
          >
            <Zap size={13} aria-hidden /> Shortcuts
          </button>
        </div>
      </div>
      {presetsOpen && (
        <div className="presets" id={presetsId}>
          {DUE_PRESETS.map((p) => (
            <button key={p.label} type="button" className="chip" onClick={() => applyPreset(p.get(new Date()))}>
              {p.label}
            </button>
          ))}
          {r.dueDate && (
            <button type="button" className="chip" onClick={() => applyPreset({ dueDate: null })}>
              Clear
            </button>
          )}
        </div>
      )}

      <div className="field">
        <span>Priority</span>
        <Segmented label="Priority" value={r.priority} options={PRIORITY_OPTIONS} onChange={setPriority} />
      </div>

      <label className="field">
        <span>Repeat</span>
        <select value={r.repeat} onChange={(e) => update({ repeat: e.target.value as Repeat })}>
          {Object.entries(REPEAT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="editor-footer">
        <span className="stamp">
          {r.status === 'done' && r.completedAt
            ? `Completed ${formatTimestamp(r.completedAt, now)}`
            : r.status === 'waiting' && r.waitingSince
              ? `Waiting since ${formatTimestamp(r.waitingSince, now)}`
              : `Created ${formatTimestamp(r.createdAt, now)}`}
        </span>
        <div className="editor-actions">
          {r.status === 'todo' && (
            <button type="button" className="text-btn" onClick={() => moveReminder(r.id, 'waiting')}>
              <Hourglass size={14} aria-hidden /> Awaiting reply
            </button>
          )}
          {r.status === 'waiting' && (
            <button type="button" className="text-btn" onClick={() => moveReminder(r.id, 'todo')}>
              <CornerUpLeft size={14} aria-hidden /> Move to To-do
            </button>
          )}
          {r.status === 'done' && (
            <button type="button" className="text-btn" onClick={() => restoreReminder(r.id)}>
              <RotateCcw size={14} aria-hidden /> Restore
            </button>
          )}
          <button type="button" className="text-btn danger" onClick={() => deleteReminder(r.id)}>
            <Trash2 size={14} aria-hidden /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
