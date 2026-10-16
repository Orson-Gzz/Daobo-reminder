import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { OpenStatus, Reminder, WeekStart } from '../types';
import { parseDateKey, toDateKey } from './dates';
import { matchesQuery } from './sort';

export const DAY_DROP_PREFIX = 'day:';
/** Drop target id for the Unscheduled tray (clears the date). */
export const NO_DATE_DROP_ID = `${DAY_DROP_PREFIX}none`;

/** Every day shown in the month containing `dateKey`, padded to whole weeks. */
export function monthGrid(dateKey: string, weekStart: WeekStart): Date[] {
  const date = parseDateKey(dateKey);
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: weekStart }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: weekStart }),
  });
}

export function weekdayLabels(weekStart: WeekStart): string[] {
  const first = startOfWeek(new Date(2026, 0, 7), { weekStartsOn: weekStart });
  return Array.from({ length: 7 }, (_, i) => format(addDays(first, i), 'EEE'));
}

/** All-day first, then by time, then priority (high first), then manual order. */
export function compareForDay(a: Reminder, b: Reminder): number {
  return (
    Number(a.dueTime !== null) - Number(b.dueTime !== null) ||
    (a.dueTime ?? '').localeCompare(b.dueTime ?? '') ||
    b.priority - a.priority ||
    a.order - b.order
  );
}

export function sortForDay(list: Reminder[]): Reminder[] {
  return [...list].sort(compareForDay);
}

export interface CalendarFilter {
  show: Record<OpenStatus, boolean>;
  query: string;
}

/** Open reminders the calendar should show, given the section toggles and search. */
export function calendarReminders(reminders: Reminder[], { show, query }: CalendarFilter): Reminder[] {
  return reminders.filter((r) => r.status !== 'done' && show[r.status] && matchesQuery(r, query));
}

/** Dated reminders keyed by `YYYY-MM-DD`, each day sorted. */
export function groupByDate(reminders: Reminder[]): Map<string, Reminder[]> {
  const map = new Map<string, Reminder[]>();
  for (const r of reminders) {
    if (!r.dueDate) continue;
    const list = map.get(r.dueDate);
    if (list) list.push(r);
    else map.set(r.dueDate, [r]);
  }
  for (const [key, list] of map) map.set(key, sortForDay(list));
  return map;
}

export interface Agenda {
  /** Items dated before today (shown only when today is selected). */
  overdue: Reminder[];
  items: Reminder[];
}

export function agendaFor(reminders: Reminder[], dateKey: string, now: number): Agenda {
  const items = sortForDay(reminders.filter((r) => r.dueDate === dateKey));
  const today = toDateKey(new Date(now));
  const overdue =
    dateKey === today
      ? reminders
          .filter((r) => r.dueDate !== null && r.dueDate < today)
          .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || compareForDay(a, b))
      : [];
  return { overdue, items };
}

/** Undated open reminders, in manual order. */
export function unscheduled(reminders: Reminder[]): Reminder[] {
  return reminders.filter((r) => !r.dueDate).sort((a, b) => a.order - b.order);
}
