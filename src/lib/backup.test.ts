import { describe, expect, it } from 'vitest';
import { BackupError, normalizeReminder, parseBackup, serializeBackup } from './backup';

describe('parseBackup', () => {
  it('round-trips an export', () => {
    const r = normalizeReminder({ id: 'a', title: 'Hello', status: 'waiting', waitingOn: 'Sam' })!;
    expect(parseBackup(serializeBackup([r]))).toEqual([r]);
  });

  it('accepts a bare array and fills defaults', () => {
    const [r] = parseBackup(JSON.stringify([{ title: 'Bare' }]));
    expect(r).toMatchObject({ title: 'Bare', status: 'todo', priority: 0, repeat: 'none', dueDate: null });
    expect(r.id).toBeTruthy();
  });

  it('drops invalid fields and untitled items', () => {
    const list = parseBackup(
      JSON.stringify({
        reminders: [
          { title: 'Ok', status: 'bogus', priority: 9, dueDate: '15/10/2026', dueTime: '10:00' },
          { title: '   ' },
          { notes: 'no title' },
        ],
      }),
    );
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ status: 'todo', priority: 0, dueDate: null, dueTime: null });
  });

  it('dedupes ids', () => {
    const list = parseBackup(JSON.stringify([{ id: 'x', title: 'A' }, { id: 'x', title: 'B' }]));
    expect(new Set(list.map((r) => r.id)).size).toBe(2);
  });

  it('rejects junk', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup('{"foo":1}')).toThrow(BackupError);
    expect(() => parseBackup('[{"nope":true}]')).toThrow(BackupError);
  });
});
