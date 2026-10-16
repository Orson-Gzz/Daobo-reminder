import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import { useCalendarReminders } from '../hooks/useVisible';
import { ChevronRightIcon } from '../icons';
import { NO_DATE_DROP_ID, unscheduled } from '../lib/calendar';
import { ReminderItem } from './ReminderItem';
import { staticStrategy } from './ReminderList';
import { cx } from './ui';

/** Open reminders without a date. Drag onto a day to schedule; drop here to clear a date. */
export function UnscheduledTray() {
  const reminders = useCalendarReminders();
  const items = useMemo(() => unscheduled(reminders), [reminders]);
  const ids = useMemo(() => items.map((r) => r.id), [items]);
  const [open, setOpen] = useState(true);
  const { setNodeRef, isOver, active } = useDroppable({ id: NO_DATE_DROP_ID });

  return (
    <section
      ref={setNodeRef}
      className={cx('tray', isOver && 'drop-over', active && 'drop-target')}
      aria-label="No date"
    >
      <button type="button" className="tray-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ChevronRightIcon size={16} className="tray-caret" aria-hidden />
        <span>No date</span>
        <span className="count">{items.length}</span>
        {open && items.length > 0 && <span className="tray-hint">Drag onto a day to schedule</span>}
      </button>
      {open &&
        (items.length > 0 ? (
          <SortableContext items={ids} strategy={staticStrategy}>
            <ul className="list">
              {items.map((r) => (
                <ReminderItem key={r.id} reminder={r} sortable={false} showStatus />
              ))}
            </ul>
          </SortableContext>
        ) : (
          <p className="agenda-empty">Everything has a date. Drop an item here to clear its date.</p>
        ))}
    </section>
  );
}
