import { describe, expect, it } from 'vitest';
import { normalizeReminder } from './backup';
import { priorityZones, visibleReminders } from './sort';
import type { Reminder } from '../types';

const make = (title: string, patch: Partial<Reminder> = {}): Reminder =>
  ({ ...normalizeReminder({ title, ...patch })!, ...patch }) as Reminder;

const titles = (list: Reminder[]) => list.map((r) => r.title);

const reminders = [
  make('Low later', { priority: 1, order: 2, dueDate: '2026-10-20' }),
  make('Plain', { priority: 0, order: 0 }),
  make('High', { priority: 3, order: 3 }),
  make('Low sooner', { priority: 1, order: 1, dueDate: '2026-10-18' }),
];
const manual = { todo: 'manual', waiting: 'manual' } as const;

describe('priorityZones', () => {
  it('returns all four zones, highest first, each sorted by the mode', () => {
    const zones = priorityZones(reminders, 'manual');
    expect(zones.map((z) => z.priority)).toEqual([3, 2, 1, 0]);
    expect(zones.map((z) => titles(z.items))).toEqual([['High'], [], ['Low sooner', 'Low later'], ['Plain']]);
  });

  it('sorts by due date within a zone', () => {
    const low = priorityZones(
      [make('B', { priority: 1, order: 0, dueDate: '2026-10-20' }), make('A', { priority: 1, order: 1, dueDate: '2026-10-18' })],
      'due',
    )[2];
    expect(titles(low.items)).toEqual(['A', 'B']);
  });
});

describe('visibleReminders', () => {
  it('lists open sections zone by zone', () => {
    expect(titles(visibleReminders(reminders, 'todo', '', manual))).toEqual([
      'High',
      'Low sooner',
      'Low later',
      'Plain',
    ]);
  });

  it('skips collapsed zones, except while searching', () => {
    const collapsed = { todo: [1 as const], waiting: [] };
    expect(titles(visibleReminders(reminders, 'todo', '', manual, Date.now(), collapsed))).toEqual(['High', 'Plain']);
    expect(titles(visibleReminders(reminders, 'todo', 'low', manual, Date.now(), collapsed))).toEqual([
      'Low sooner',
      'Low later',
    ]);
  });
});
