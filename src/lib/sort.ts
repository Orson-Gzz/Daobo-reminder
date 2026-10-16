import { differenceInCalendarDays } from 'date-fns';
import type { OpenStatus, Priority, Reminder, SortMode, Status } from '../types';
import { dueSortKey } from './dates';

export function matchesQuery(r: Reminder, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    r.title.toLowerCase().includes(q) ||
    r.notes.toLowerCase().includes(q) ||
    r.waitingOn.toLowerCase().includes(q)
  );
}

const byOrder = (a: Reminder, b: Reminder) => a.order - b.order;
const byDue = (a: Reminder, b: Reminder) => dueSortKey(a) - dueSortKey(b);

export function sortReminders(list: Reminder[], mode: SortMode): Reminder[] {
  const sorted = [...list];
  switch (mode) {
    case 'manual':
      return sorted.sort(byOrder);
    case 'due':
      return sorted.sort((a, b) => byDue(a, b) || byOrder(a, b));
  }
}

/** List sections are split into these zones, top to bottom. */
export const PRIORITY_ZONES: Priority[] = [3, 2, 1, 0];

export interface PriorityZone {
  priority: Priority;
  items: Reminder[];
}

/** All four zones (empty ones included), each sorted by `mode`. */
export function priorityZones(list: Reminder[], mode: SortMode): PriorityZone[] {
  const sorted = sortReminders(list, mode);
  return PRIORITY_ZONES.map((priority) => ({
    priority,
    items: sorted.filter((r) => r.priority === priority),
  }));
}

const byCompletedDesc = (a: Reminder, b: Reminder) =>
  (b.completedAt ?? '').localeCompare(a.completedAt ?? '');

export interface CompletedGroup {
  label: string;
  items: Reminder[];
}

export function groupCompleted(list: Reminder[], now = Date.now()): CompletedGroup[] {
  const groups: CompletedGroup[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Earlier', items: [] },
  ];
  for (const r of [...list].sort(byCompletedDesc)) {
    const days = r.completedAt ? differenceInCalendarDays(now, new Date(r.completedAt)) : Infinity;
    const index = days <= 0 ? 0 : days === 1 ? 1 : days <= 7 ? 2 : 3;
    groups[index].items.push(r);
  }
  return groups.filter((g) => g.items.length > 0);
}

/** Reminders shown in a section, in display order. Collapsed zones are skipped unless searching. */
export function visibleReminders(
  reminders: Reminder[],
  section: Status,
  query: string,
  sort: Record<OpenStatus, SortMode>,
  now = Date.now(),
  collapsed?: Record<OpenStatus, Priority[]>,
): Reminder[] {
  const list = reminders.filter((r) => r.status === section && matchesQuery(r, query));
  if (section === 'done') return groupCompleted(list, now).flatMap((g) => g.items);
  const hidden = query.trim() ? [] : (collapsed?.[section] ?? []);
  return priorityZones(list, sort[section])
    .filter((z) => !hidden.includes(z.priority))
    .flatMap((z) => z.items);
}
