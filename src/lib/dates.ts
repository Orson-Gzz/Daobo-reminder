import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  format,
  isWeekend,
  startOfDay,
} from 'date-fns';
import type { Reminder, Repeat } from '../types';

/** All-day reminders notify at this local time. */
export const ALL_DAY_NOTIFY_TIME = '09:00';

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toTimeKey(date: Date): string {
  return format(date, 'HH:mm');
}

function withTime(date: Date, time: string): Date {
  const [h, min] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, min, 0, 0);
  return d;
}

/** Moment a reminder becomes due (for notifications). All-day items use 09:00. */
export function dueTimestamp(r: Pick<Reminder, 'dueDate' | 'dueTime'>): number | null {
  if (!r.dueDate) return null;
  return withTime(parseDateKey(r.dueDate), r.dueTime ?? ALL_DAY_NOTIFY_TIME).getTime();
}

/** Sort key: all-day items sort at the end of their day. */
export function dueSortKey(r: Pick<Reminder, 'dueDate' | 'dueTime'>): number {
  if (!r.dueDate) return Number.POSITIVE_INFINITY;
  return withTime(parseDateKey(r.dueDate), r.dueTime ?? '23:59').getTime();
}

export function isOverdue(r: Pick<Reminder, 'dueDate' | 'dueTime'>, now = Date.now()): boolean {
  if (!r.dueDate) return false;
  if (r.dueTime) return now > withTime(parseDateKey(r.dueDate), r.dueTime).getTime();
  return differenceInCalendarDays(now, parseDateKey(r.dueDate)) > 0;
}

export function isDueToday(r: Pick<Reminder, 'dueDate'>, now = Date.now()): boolean {
  return !!r.dueDate && differenceInCalendarDays(parseDateKey(r.dueDate), now) === 0;
}

/** "Today", "Tomorrow 3:00 PM", "Fri", "Oct 21", "Oct 21, 2027". */
export function formatDue(r: Pick<Reminder, 'dueDate' | 'dueTime'>, now = Date.now()): string {
  if (!r.dueDate) return '';
  const date = parseDateKey(r.dueDate);
  const diff = differenceInCalendarDays(date, now);
  let label: string;
  if (diff === 0) label = 'Today';
  else if (diff === 1) label = 'Tomorrow';
  else if (diff === -1) label = 'Yesterday';
  else if (diff > 1 && diff < 7) label = format(date, 'EEE');
  else if (date.getFullYear() === new Date(now).getFullYear()) label = format(date, 'MMM d');
  else label = format(date, 'MMM d, yyyy');
  return r.dueTime ? `${label} ${format(withTime(date, r.dueTime), 'p')}` : label;
}

/** Compact time for calendar chips: "6pm", "6:30pm". */
export function formatShortTime(time: string): string {
  const d = withTime(new Date(2000, 0, 1), time);
  return format(d, d.getMinutes() ? 'h:mmaaa' : 'haaa');
}

/** Compact age: "today", "3d", "2w", "4mo". */
export function formatAge(iso: string, now = Date.now()): string {
  const days = differenceInCalendarDays(now, new Date(iso));
  if (days <= 0) return 'today';
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

export function formatTimestamp(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const diff = differenceInCalendarDays(date, now);
  if (diff === 0) return format(date, 'p');
  if (diff === -1) return `Yesterday ${format(date, 'p')}`;
  if (date.getFullYear() === new Date(now).getFullYear()) return format(date, 'MMM d, p');
  return format(date, 'MMM d, yyyy');
}

function step(base: Date, repeat: Exclude<Repeat, 'none' | 'weekdays'>, k: number): Date {
  switch (repeat) {
    case 'daily':
      return addDays(base, k);
    case 'weekly':
      return addDays(base, 7 * k);
    case 'monthly':
      return addMonths(base, k);
    case 'yearly':
      return addYears(base, k);
  }
}

/**
 * Next due date for a repeating reminder: the first occurrence after both its
 * current due date and today, so completing an overdue item never yields
 * another overdue one. Reminders without a due date repeat from today.
 */
export function nextOccurrence(
  dueDate: string | null,
  repeat: Repeat,
  now: Date | number = Date.now(),
): string | null {
  if (repeat === 'none') return null;
  const today = startOfDay(now);
  const base = dueDate ? parseDateKey(dueDate) : today;
  const floor = base > today ? base : today;

  if (repeat === 'weekdays') {
    let next = addDays(floor, 1);
    while (isWeekend(next)) next = addDays(next, 1);
    return toDateKey(next);
  }

  let k = 1;
  let next = step(base, repeat, k);
  while (next <= floor) next = step(base, repeat, ++k);
  return toDateKey(next);
}

export interface DuePreset {
  label: string;
  get: (now: Date) => { dueDate: string; dueTime: string | null };
}

export const DUE_PRESETS: DuePreset[] = [
  {
    label: 'In 1 hour',
    get: (now) => {
      const d = new Date(now.getTime() + 60 * 60 * 1000);
      d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
      return { dueDate: toDateKey(d), dueTime: toTimeKey(d) };
    },
  },
  { label: 'This evening', get: (now) => ({ dueDate: toDateKey(now), dueTime: '18:00' }) },
  { label: 'Tomorrow', get: (now) => ({ dueDate: toDateKey(addDays(now, 1)), dueTime: '09:00' }) },
  {
    label: 'Next week',
    get: (now) => {
      // Next Monday.
      const days = ((8 - now.getDay()) % 7) || 7;
      return { dueDate: toDateKey(addDays(now, days)), dueTime: '09:00' };
    },
  },
];
