import { useDraggable, useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { memo, useMemo, type KeyboardEvent } from 'react';
import { useCalendarReminders } from '../hooks/useVisible';
import { DAY_DROP_PREFIX, groupByDate, monthGrid, weekdayLabels } from '../lib/calendar';
import { formatShortTime, isOverdue, parseDateKey, toDateKey } from '../lib/dates';
import { openReminder, selectDate, useStore, useUI } from '../store';
import type { Reminder } from '../types';
import { cx } from './ui';

const MAX_CHIPS = 3;

export function ChipLabel({ r }: { r: Reminder }) {
  return (
    <>
      {r.dueTime && <span className="chip-time">{formatShortTime(r.dueTime)}</span>}
      <span className="chip-title">{r.title}</span>
    </>
  );
}

function CalendarChip({ r, now }: { r: Reminder; now: number }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `chip:${r.id}`,
    data: { reminderId: r.id, chip: true },
  });
  const open = () => openReminder(r.id);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cx('cal-chip', r.status, isOverdue(r, now) && 'overdue', r.priority === 3 && 'high', isDragging && 'dragging')}
      title={r.title}
      onClick={(e) => {
        e.stopPropagation();
        open();
      }}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          open();
        }
      }}
    >
      <ChipLabel r={r} />
    </div>
  );
}

interface DayCellProps {
  date: Date;
  dateKey: string;
  items: Reminder[];
  outside: boolean;
  today: boolean;
  selected: boolean;
  now: number;
}

const DayCell = memo(function DayCell({ date, dateKey, items, outside, today, selected, now }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: DAY_DROP_PREFIX + dateKey });
  const extra = items.length - MAX_CHIPS;
  return (
    <div
      ref={setNodeRef}
      className={cx('day', outside && 'outside', today && 'today', selected && 'selected', isOver && 'drop-over')}
      onClick={() => selectDate(dateKey)}
    >
      <button
        type="button"
        className="day-num"
        aria-label={`${format(date, 'EEEE, MMMM d')}${items.length ? `, ${items.length} reminder${items.length === 1 ? '' : 's'}` : ''}`}
        aria-pressed={selected}
        aria-current={today ? 'date' : undefined}
      >
        {date.getDate()}
      </button>
      <div className="day-chips">
        {items.slice(0, MAX_CHIPS).map((r) => (
          <CalendarChip key={r.id} r={r} now={now} />
        ))}
        {extra > 0 && <span className="more">+{extra}<span className="more-word"> more</span></span>}
      </div>
    </div>
  );
});

export function MonthGrid() {
  const selectedDate = useUI((s) => s.selectedDate);
  const now = useUI((s) => s.now);
  const weekStart = useStore((s) => s.settings.weekStart);
  const reminders = useCalendarReminders();

  const monthKey = selectedDate.slice(0, 7);
  const days = useMemo(() => monthGrid(`${monthKey}-01`, weekStart), [monthKey, weekStart]);
  const byDate = useMemo(() => groupByDate(reminders), [reminders]);
  const today = toDateKey(new Date(now));

  return (
    <div className="month" aria-label={format(parseDateKey(selectedDate), 'MMMM yyyy')}>
      <div className="month-head" aria-hidden>
        {weekdayLabels(weekStart).map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="month-days">
        {days.map((date) => {
          const key = toDateKey(date);
          return (
            <DayCell
              key={key}
              date={date}
              dateKey={key}
              items={byDate.get(key) ?? EMPTY}
              outside={!key.startsWith(monthKey)}
              today={key === today}
              selected={key === selectedDate}
              now={now}
            />
          );
        })}
      </div>
    </div>
  );
}

const EMPTY: Reminder[] = [];
