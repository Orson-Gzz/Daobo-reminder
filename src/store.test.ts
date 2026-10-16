import { beforeEach, describe, expect, it } from 'vitest';
import { parseCalendarAdd, parseQuickAdd, rescheduleReminder } from './actions';
import { collectDue } from './hooks/useNotifications';
import { visibleReminders } from './lib/sort';
import { useStore, useUI } from './store';
import type { Reminder } from './types';

const s = () => useStore.getState();
const byId = (id: string) => s().reminders.find((r) => r.id === id)!;
const sort = { todo: 'manual', waiting: 'manual' } as const;
const titles = (section: Reminder['status']) =>
  visibleReminders(s().reminders, section, '', sort).map((r) => r.title);

beforeEach(() => {
  useStore.setState({ reminders: [] });
});

describe('add', () => {
  it('puts new reminders at the top of their section', () => {
    s().add({ title: 'First', status: 'todo' });
    s().add({ title: 'Second', status: 'todo' });
    s().add({ title: 'Ping Alice', status: 'waiting', waitingOn: 'Alice' });
    expect(titles('todo')).toEqual(['Second', 'First']);
    expect(titles('waiting')).toEqual(['Ping Alice']);
    const waiting = s().reminders.find((r) => r.status === 'waiting')!;
    expect(waiting.waitingOn).toBe('Alice');
    expect(waiting.waitingSince).not.toBeNull();
  });
});

describe('move / complete / restore', () => {
  it('moves between To-do and Awaiting Reply, with undo', () => {
    const r = s().add({ title: 'Send invoice', status: 'todo' });
    const undo = s().move(r.id, 'waiting')!;
    expect(byId(r.id)).toMatchObject({ status: 'waiting', prevStatus: 'waiting' });
    expect(byId(r.id).waitingSince).not.toBeNull();
    undo();
    expect(byId(r.id)).toMatchObject({ status: 'todo', waitingSince: null });
  });

  it('restores a completed reminder to the section it came from', () => {
    const r = s().add({ title: 'Reply from Bob', status: 'waiting' });
    const since = byId(r.id).waitingSince;
    s().complete(r.id);
    expect(byId(r.id)).toMatchObject({ status: 'done', prevStatus: 'waiting' });
    expect(byId(r.id).completedAt).not.toBeNull();
    s().restore(r.id);
    expect(byId(r.id)).toMatchObject({ status: 'waiting', completedAt: null, waitingSince: since });
  });

  it('keeps a repeating reminder in place with its next date and logs a completed copy', () => {
    const r = s().add({ title: 'Water plants', status: 'todo' });
    s().update(r.id, { repeat: 'daily', dueDate: '2020-01-01', dueTime: '08:00' });
    const result = s().complete(r.id)!;

    const original = byId(r.id);
    expect(original.status).toBe('todo');
    expect(original.dueDate).toBe(result.next);
    expect(original.dueDate! > '2020-01-01').toBe(true);
    expect(original.dueTime).toBe('08:00');

    const log = s().reminders.filter((x) => x.status === 'done');
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ title: 'Water plants', repeat: 'none', prevStatus: 'todo' });

    result.undo();
    expect(s().reminders).toHaveLength(1);
    expect(byId(r.id).dueDate).toBe('2020-01-01');
  });
});

describe('update', () => {
  it('clears the time and notification state when the date changes', () => {
    const r = s().add({ title: 'Call', status: 'todo' });
    s().update(r.id, { dueDate: '2026-10-20', dueTime: '10:00' });
    s().markNotified([r.id]);
    expect(byId(r.id).notifiedAt).not.toBeNull();
    s().update(r.id, { dueTime: '11:00' });
    expect(byId(r.id).notifiedAt).toBeNull();
    s().update(r.id, { dueDate: null });
    expect(byId(r.id)).toMatchObject({ dueDate: null, dueTime: null });
  });
});

describe('remove / clear', () => {
  it('deletes with undo', () => {
    const a = s().add({ title: 'A', status: 'todo' });
    s().add({ title: 'B', status: 'todo' });
    const undo = s().remove([a.id])!;
    expect(titles('todo')).toEqual(['B']);
    undo();
    expect(titles('todo')).toEqual(['B', 'A']);
  });

  it('clears completed with undo', () => {
    const a = s().add({ title: 'A', status: 'todo' });
    const b = s().add({ title: 'B', status: 'todo' });
    s().complete(a.id);
    s().complete(b.id);
    const undo = s().clearCompleted()!;
    expect(s().reminders).toHaveLength(0);
    undo();
    expect(s().reminders.filter((r) => r.status === 'done')).toHaveLength(2);
  });
});

describe('reorder', () => {
  it('reassigns manual order within a section only', () => {
    const a = s().add({ title: 'A', status: 'todo' });
    const w = s().add({ title: 'W', status: 'waiting' });
    const b = s().add({ title: 'B', status: 'todo' });
    const c = s().add({ title: 'C', status: 'todo' });
    expect(titles('todo')).toEqual(['C', 'B', 'A']);
    s().reorder([a.id, c.id, b.id]);
    expect(titles('todo')).toEqual(['A', 'C', 'B']);
    expect(byId(w.id).order).toBe(-1);
  });
});

describe('import', () => {
  it('merges by id and can be undone', () => {
    const a = s().add({ title: 'A', status: 'todo' });
    const undo = s().importReminders(
      [
        { ...byId(a.id), title: 'A (imported)' },
        { ...byId(a.id), id: 'new-1', title: 'New' },
      ],
      'merge',
    );
    expect(s().reminders.map((r) => r.title).sort()).toEqual(['A (imported)', 'New']);
    undo();
    expect(s().reminders.map((r) => r.title)).toEqual(['A']);
  });

  it('replaces everything and can be undone', () => {
    const a = s().add({ title: 'A', status: 'todo' });
    const undo = s().importReminders([{ ...byId(a.id), id: 'x', title: 'X' }], 'replace');
    expect(s().reminders.map((r) => r.title)).toEqual(['X']);
    undo();
    expect(s().reminders.map((r) => r.title)).toEqual(['A']);
  });
});

describe('collectDue', () => {
  it('returns open reminders past due that have not notified', () => {
    const a = s().add({ title: 'Due', status: 'todo' });
    const b = s().add({ title: 'Later', status: 'todo' });
    const c = s().add({ title: 'Done', status: 'todo' });
    const d = s().add({ title: 'Already', status: 'waiting' });
    s().update(a.id, { dueDate: '2026-10-15', dueTime: '09:00' });
    s().update(b.id, { dueDate: '2026-10-15', dueTime: '18:00' });
    s().update(c.id, { dueDate: '2026-10-15', dueTime: '09:00' });
    s().update(d.id, { dueDate: '2026-10-15', dueTime: '09:00' });
    s().complete(c.id);
    s().markNotified([d.id]);
    const due = collectDue(s().reminders, new Date(2026, 9, 15, 12).getTime());
    expect(due.map((r) => r.title)).toEqual(['Due']);
  });
});

describe('parseQuickAdd', () => {
  it('extracts @who for Awaiting Reply only', () => {
    expect(parseQuickAdd('Contract draft @Alice Smith', 'waiting')).toEqual({
      title: 'Contract draft',
      waitingOn: 'Alice Smith',
    });
    expect(parseQuickAdd('Email me@example.com', 'todo')).toEqual({ title: 'Email me@example.com', waitingOn: '' });
    expect(parseQuickAdd('@Alice', 'waiting')).toEqual({ title: '@Alice', waitingOn: '' });
  });
});

describe('rescheduleReminder', () => {
  it('moves the date, keeps the time, and undoes', () => {
    const r = s().add({ title: 'Dentist', status: 'todo', dueDate: '2026-10-16' });
    s().update(r.id, { dueTime: '15:00' });
    rescheduleReminder(r.id, '2026-10-20');
    expect(byId(r.id)).toMatchObject({ dueDate: '2026-10-20', dueTime: '15:00' });
    expect(useUI.getState().toast?.message).toBe('Moved to Tue, Oct 20');
    useUI.getState().toast!.undo!();
    expect(byId(r.id)).toMatchObject({ dueDate: '2026-10-16', dueTime: '15:00' });
  });

  it('clears the date when dropped on No date', () => {
    const r = s().add({ title: 'Someday', status: 'waiting', dueDate: '2026-10-16' });
    rescheduleReminder(r.id, null);
    expect(byId(r.id)).toMatchObject({ dueDate: null, dueTime: null });
  });
});

describe('parseCalendarAdd', () => {
  it('turns a trailing @name into an Awaiting Reply item', () => {
    expect(parseCalendarAdd('Invoice @Acme Corp')).toEqual({ title: 'Invoice', status: 'waiting', waitingOn: 'Acme Corp' });
    expect(parseCalendarAdd('Gym')).toEqual({ title: 'Gym', status: 'todo', waitingOn: '' });
  });
});
