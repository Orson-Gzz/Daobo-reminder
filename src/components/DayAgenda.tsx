import { SortableContext } from '@dnd-kit/sortable';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { useCalendarReminders } from '../hooks/useVisible';
import { agendaFor } from '../lib/calendar';
import { parseDateKey, toDateKey } from '../lib/dates';
import { useUI } from '../store';
import type { Reminder } from '../types';
import { QuickAdd } from './QuickAdd';
import { ReminderItem } from './ReminderItem';
import { staticStrategy } from './ReminderList';

function Rows({ items }: { items: Reminder[] }) {
  return (
    <ul className="list">
      {items.map((r) => (
        <ReminderItem key={r.id} reminder={r} sortable={false} showStatus />
      ))}
    </ul>
  );
}

export function DayAgenda() {
  const selectedDate = useUI((s) => s.selectedDate);
  const now = useUI((s) => s.now);
  const reminders = useCalendarReminders();
  const { overdue, items } = useMemo(() => agendaFor(reminders, selectedDate, now), [reminders, selectedDate, now]);
  const ids = useMemo(() => [...overdue, ...items].map((r) => r.id), [overdue, items]);

  const date = parseDateKey(selectedDate);
  const isToday = selectedDate === toDateKey(new Date(now));
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  const heading = format(date, sameYear ? 'EEEE, MMM d' : 'EEEE, MMM d, yyyy');

  return (
    <section className="agenda" aria-label={`Reminders on ${heading}`}>
      <h2 className="agenda-title">
        {isToday && <span className="agenda-today">Today</span>}
        {heading}
        <span className="count">{items.length}</span>
      </h2>
      <QuickAdd key={selectedDate} dueDate={selectedDate} />
      <SortableContext items={ids} strategy={staticStrategy}>
        {overdue.length > 0 && (
          <>
            <h3 className="group-label overdue-label">Overdue</h3>
            <Rows items={overdue} />
            {items.length > 0 && <h3 className="group-label">Today</h3>}
          </>
        )}
        {items.length > 0 ? (
          <Rows items={items} />
        ) : (
          <p className="agenda-empty">Nothing scheduled{isToday ? ' today' : ''}.</p>
        )}
      </SortableContext>
    </section>
  );
}
