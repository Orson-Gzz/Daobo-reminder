import type { Priority, Reminder, Repeat, Status } from '../types';

export const BACKUP_VERSION = 1;

const STATUSES: Status[] = ['todo', 'waiting', 'done'];
const REPEATS: Repeat[] = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);

/**
 * Coerce an unknown value into a valid Reminder, or return null when it can't
 * be salvaged (no title). Used for imports and for data loaded from storage.
 */
export function normalizeReminder(raw: unknown, index = 0): Reminder | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = str(o.title).trim();
  if (!title) return null;

  const now = new Date().toISOString();
  const status = STATUSES.includes(o.status as Status) ? (o.status as Status) : 'todo';
  const prevStatus = o.prevStatus === 'waiting' ? 'waiting' : 'todo';
  const dueDate = typeof o.dueDate === 'string' && DATE_RE.test(o.dueDate) ? o.dueDate : null;
  const dueTime =
    dueDate && typeof o.dueTime === 'string' && TIME_RE.test(o.dueTime) ? o.dueTime : null;
  const priority = [0, 1, 2, 3].includes(o.priority as number) ? (o.priority as Priority) : 0;

  return {
    id: str(o.id) || crypto.randomUUID(),
    title,
    notes: str(o.notes),
    status,
    prevStatus: status === 'waiting' ? 'waiting' : status === 'todo' ? 'todo' : prevStatus,
    dueDate,
    dueTime,
    priority,
    repeat: REPEATS.includes(o.repeat as Repeat) ? (o.repeat as Repeat) : 'none',
    waitingOn: str(o.waitingOn),
    waitingSince: strOrNull(o.waitingSince) ?? (status === 'waiting' ? now : null),
    completedAt: strOrNull(o.completedAt) ?? (status === 'done' ? now : null),
    notifiedAt: strOrNull(o.notifiedAt),
    order: typeof o.order === 'number' && Number.isFinite(o.order) ? o.order : index,
    createdAt: str(o.createdAt, now),
    updatedAt: str(o.updatedAt, now),
  };
}

export function normalizeList(raw: unknown): Reminder[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Reminder[] = [];
  raw.forEach((item, i) => {
    const r = normalizeReminder(item, i);
    if (!r) return;
    if (seen.has(r.id)) r.id = crypto.randomUUID();
    seen.add(r.id);
    out.push(r);
  });
  return out;
}

export function serializeBackup(reminders: Reminder[]): string {
  return JSON.stringify(
    { app: 'reminders', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), reminders },
    null,
    2,
  );
}

export class BackupError extends Error {}

/** Accepts either a backup object (`{ reminders: [...] }`) or a bare array. */
export function parseBackup(text: string): Reminder[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('That file isn’t valid JSON.');
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { reminders?: unknown }).reminders)
      ? (data as { reminders: unknown[] }).reminders
      : null;
  if (!list) throw new BackupError('No reminders found in that file.');
  const reminders = normalizeList(list);
  if (list.length > 0 && reminders.length === 0) {
    throw new BackupError('No valid reminders found in that file.');
  }
  return reminders;
}

export function downloadBackup(reminders: Reminder[]) {
  const blob = new Blob([serializeBackup(reminders)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reminders-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
