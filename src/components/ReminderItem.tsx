import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bell, Check, ChevronUp, CornerUpLeft, Hourglass, Repeat, Trash2 } from 'lucide-react';
import { memo, useEffect, useState, type ReactNode } from 'react';
import { deleteReminder, moveReminder, toggleDone } from '../actions';
import { formatAge, formatDue, formatTimestamp, isDueToday, isOverdue } from '../lib/dates';
import { useStore, useUI } from '../store';
import { SECTION_NAME, type Reminder } from '../types';
import { ReminderEditor } from './ReminderEditor';
import { cx, IconButton } from './ui';

export function Priority({ level }: { level: number }) {
  if (!level) return null;
  return (
    <span className={cx('priority', `p${level}`)} aria-label={['', 'Low', 'Medium', 'High'][level] + ' priority'}>
      {'!'.repeat(level)}
    </span>
  );
}

export function Meta({ r, now }: { r: Reminder; now: number }) {
  const parts: ReactNode[] = [];
  if (r.status === 'done') {
    if (r.completedAt) parts.push(<span key="done">{formatTimestamp(r.completedAt, now)}</span>);
  } else if (r.dueDate) {
    const tone = isOverdue(r, now) ? 'overdue' : isDueToday(r, now) ? 'today' : '';
    parts.push(
      <span key="due" className={cx('due', tone)}>
        {r.status === 'waiting' ? 'Follow up ' : <Bell size={12} aria-hidden />}
        {formatDue(r, now)}
      </span>,
    );
  }
  if (r.repeat !== 'none') {
    parts.push(<Repeat key="rep" size={12} aria-label={`Repeats ${r.repeat}`} />);
  }
  if (r.status === 'waiting' || (r.status === 'done' && r.waitingOn)) {
    const who = r.waitingOn ? `from ${r.waitingOn}` : '';
    const age = r.status === 'waiting' && r.waitingSince ? formatAge(r.waitingSince, now) : '';
    if (who || age) {
      parts.push(
        <span key="wait" className="waiting">
          {[who, age && (age === 'today' ? 'since today' : `${age} ago`)].filter(Boolean).join(' · ')}
        </span>,
      );
    }
  }
  if (r.notes) parts.push(<span key="notes" className="notes-preview">{r.notes.split('\n')[0]}</span>);
  if (!parts.length) return null;
  return <span className="meta">{parts}</span>;
}

// Focusing on open is handy with a keyboard but pops up the on-screen keyboard on touch devices.
const autoFocusTitle = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;

function TitleInput({ r }: { r: Reminder }) {
  const [draft, setDraft] = useState(r.title);
  useEffect(() => setDraft(r.title), [r.title]);
  return (
    <input
      className="title-input"
      aria-label="Title"
      value={draft}
      autoFocus={autoFocusTitle}
      onChange={(e) => {
        setDraft(e.target.value);
        if (e.target.value.trim()) useStore.getState().update(r.id, { title: e.target.value });
      }}
      onBlur={() => {
        if (!draft.trim()) setDraft(r.title);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          useUI.setState({ expandedId: null });
        }
      }}
    />
  );
}

interface Props {
  reminder: Reminder;
  sortable: boolean;
  /** Calendar: mark which section the item belongs to. */
  showStatus?: boolean;
}

export const ReminderItem = memo(function ReminderItem({ reminder: r, sortable, showStatus }: Props) {
  const expanded = useUI((s) => s.expandedId === r.id);
  const selected = useUI((s) => s.selectedId === r.id);
  const now = useUI((s) => s.now);
  const done = r.status === 'done';

  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: r.id,
    disabled: expanded,
    data: { sortable, reminderId: r.id },
  });

  const toggleExpand = () =>
    useUI.setState({ expandedId: expanded ? null : r.id, selectedId: r.id });

  return (
    <li
      ref={setNodeRef}
      data-id={r.id}
      className={cx('item', expanded && 'expanded', selected && 'selected', isDragging && 'dragging', done && 'done')}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...listeners}
    >
      <div className="row">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Restore “${r.title}”` : `Complete “${r.title}”`}
          className={cx('check', r.priority === 3 && 'high')}
          onClick={() => toggleDone(r.id)}
        >
          <Check size={13} strokeWidth={3} aria-hidden />
        </button>

        {expanded ? (
          <TitleInput r={r} />
        ) : (
          <button type="button" className="row-main" aria-expanded={false} onClick={toggleExpand}>
            <span className="title">
              {showStatus && (
                <span
                  className={cx('status-dot', r.status)}
                  title={SECTION_NAME[r.status]}
                  aria-label={SECTION_NAME[r.status]}
                />
              )}
              <Priority level={r.priority} />
              {r.title}
            </span>
            <Meta r={r} now={now} />
          </button>
        )}

        <div className="row-actions">
          {expanded ? (
            <IconButton label="Close" onClick={toggleExpand}>
              <ChevronUp size={16} />
            </IconButton>
          ) : (
            <>
              {r.status === 'todo' && (
                <IconButton label="Move to Awaiting Reply (w)" onClick={() => moveReminder(r.id, 'waiting')}>
                  <Hourglass size={16} />
                </IconButton>
              )}
              {r.status === 'waiting' && (
                <IconButton label="Got a reply: move to To-do (w)" onClick={() => moveReminder(r.id, 'todo')}>
                  <CornerUpLeft size={16} />
                </IconButton>
              )}
              <IconButton label="Delete" className="danger" onClick={() => deleteReminder(r.id)}>
                <Trash2 size={16} />
              </IconButton>
            </>
          )}
        </div>
      </div>
      {expanded && <ReminderEditor reminder={r} />}
    </li>
  );
});
