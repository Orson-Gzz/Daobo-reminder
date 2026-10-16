import { describe, expect, it } from 'vitest';
import { normalizeReminder } from './backup';
import { agendaFor, calendarReminders, groupByDate, monthGrid, sortForDay, unscheduled, weekdayLabels } from './calendar';
import { toDateKey } from './dates';
import type { Reminder } from '../types';

let seq = 0;
const make = (patch: Partial<Reminder>): Reminder =>
  ({ ...normalizeReminder({ title: `R${++seq}`, ...patch })!, ...patch }) as Reminder;

describe('monthGrid', () => {
  it('pads October 2026 to whole weeks starting Monday', () => {
    const days = monthGrid('2026-10-16', 1);
    expect(days).toHaveLength(35);
    expect(toDateKey(days[0])).toBe('2026-09-28');
    expect(toDateKey(days.at(-1)!)).toBe('2026-11-01');
  });

  it('pads to whole weeks starting Sunday', () => {
    const days = monthGrid('2026-10-01', 0);
    expect(toDateKey(days[0])).toBe('2026-09-27');
    expect(toDateKey(days.at(-1)!)).toBe('2026-10-31');
  });

  it('uses exactly four rows when the month fits', () => {
    // Feb 2026 starts on a Sunday and has 28 days.
    expect(monthGrid('2026-02-10', 0)).toHaveLength(28);
  });

  it('labels weekdays in order', () => {
    expect(weekdayLabels(1)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekdayLabels(0)[0]).toBe('Sun');
  });
});

describe('day grouping', () => {
  it('sorts all-day first, then by time, then priority', () => {
    const a = make({ title: 'late', dueDate: '2026-10-16', dueTime: '18:00' });
    const b = make({ title: 'allday-low', dueDate: '2026-10-16', priority: 1 });
    const c = make({ title: 'early', dueDate: '2026-10-16', dueTime: '08:30' });
    const d = make({ title: 'allday-high', dueDate: '2026-10-16', priority: 3 });
    expect(sortForDay([a, b, c, d]).map((r) => r.title)).toEqual(['allday-high', 'allday-low', 'early', 'late']);
  });

  it('groups by date and skips undated', () => {
    const map = groupByDate([
      make({ dueDate: '2026-10-16' }),
      make({ dueDate: '2026-10-17' }),
      make({ dueDate: '2026-10-16' }),
      make({}),
    ]);
    expect([...map.keys()].sort()).toEqual(['2026-10-16', '2026-10-17']);
    expect(map.get('2026-10-16')).toHaveLength(2);
  });
});

describe('agendaFor / unscheduled / calendarReminders', () => {
  const NOW = new Date(2026, 9, 16, 10).getTime();
  const list = [
    make({ title: 'today', dueDate: '2026-10-16' }),
    make({ title: 'old', dueDate: '2026-10-10' }),
    make({ title: 'older', dueDate: '2026-10-02' }),
    make({ title: 'tomorrow', dueDate: '2026-10-17' }),
    make({ title: 'undated' }),
  ];

  it('adds overdue items only when viewing today', () => {
    const today = agendaFor(list, '2026-10-16', NOW);
    expect(today.items.map((r) => r.title)).toEqual(['today']);
    expect(today.overdue.map((r) => r.title)).toEqual(['older', 'old']);
    expect(agendaFor(list, '2026-10-17', NOW).overdue).toEqual([]);
  });

  it('lists undated items', () => {
    expect(unscheduled(list).map((r) => r.title)).toEqual(['undated']);
  });

  it('applies section toggles, search, and hides completed', () => {
    const items = [
      make({ title: 'Call Ann', status: 'todo' }),
      make({ title: 'Quote', status: 'waiting', waitingOn: 'Ann' }),
      make({ title: 'Done', status: 'done' }),
    ];
    const all = calendarReminders(items, { show: { todo: true, waiting: true }, query: '' });
    expect(all.map((r) => r.title)).toEqual(['Call Ann', 'Quote']);
    const onlyTodo = calendarReminders(items, { show: { todo: true, waiting: false }, query: '' });
    expect(onlyTodo.map((r) => r.title)).toEqual(['Call Ann']);
    const search = calendarReminders(items, { show: { todo: true, waiting: true }, query: 'ann' });
    expect(search).toHaveLength(2);
  });
});
