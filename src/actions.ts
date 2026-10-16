// User-facing actions shared by buttons, drag-and-drop, and keyboard shortcuts.
// Each wraps a store action and surfaces an undoable toast.
import { arrayMove } from '@dnd-kit/sortable';
import { format } from 'date-fns';
import { getVisible } from './hooks/useVisible';
import { formatDue, parseDateKey } from './lib/dates';
import { showToast, useStore, useUI } from './store';
import { PRIORITY_NAME, SECTION_NAME, type OpenStatus, type Priority, type Status } from './types';

const get = () => useStore.getState();
const quote = (title: string) => `“${title.length > 40 ? `${title.slice(0, 39)}…` : title}”`;

function collapseIf(id: string) {
  const ui = useUI.getState();
  if (ui.expandedId === id) useUI.setState({ expandedId: null });
}

export function completeReminder(id: string) {
  const r = get().reminders.find((x) => x.id === id);
  const result = get().complete(id);
  if (!r || !result) return;
  collapseIf(id);
  const message = result.next
    ? `Done. Next: ${formatDue({ dueDate: result.next, dueTime: r.dueTime })}`
    : `Completed ${quote(r.title)}`;
  showToast(message, result.undo);
}

export function restoreReminder(id: string) {
  const r = get().reminders.find((x) => x.id === id);
  if (!r || r.status !== 'done') return;
  moveReminder(id, r.prevStatus);
}

export function moveReminder(id: string, to: OpenStatus) {
  const undo = get().move(id, to);
  if (!undo) return;
  collapseIf(id);
  showToast(`Moved to ${SECTION_NAME[to]}`, undo);
}

/** Drop target handler: a section tab. */
export function sendToSection(id: string, to: Status) {
  if (to === 'done') completeReminder(id);
  else moveReminder(id, to);
}

export function toggleWaiting(id: string) {
  const r = get().reminders.find((x) => x.id === id);
  if (!r || r.status === 'done') return;
  moveReminder(id, r.status === 'todo' ? 'waiting' : 'todo');
}

export function toggleDone(id: string) {
  const r = get().reminders.find((x) => x.id === id);
  if (!r) return;
  if (r.status === 'done') restoreReminder(id);
  else completeReminder(id);
}

export function deleteReminder(id: string) {
  const r = get().reminders.find((x) => x.id === id);
  const undo = get().remove([id]);
  if (!r || !undo) return;
  collapseIf(id);
  showToast(`Deleted ${quote(r.title)}`, undo);
}

export function clearCompleted() {
  const count = get().reminders.filter((r) => r.status === 'done').length;
  const undo = get().clearCompleted();
  if (undo) showToast(`Cleared ${count} completed`, undo);
}

/** Set or clear a reminder's date (calendar drag), keeping its time. */
export function rescheduleReminder(id: string, dateKey: string | null) {
  const r = get().reminders.find((x) => x.id === id);
  if (!r || r.dueDate === dateKey) return;
  get().update(id, { dueDate: dateKey });
  const message = dateKey
    ? `Moved to ${format(parseDateKey(dateKey), 'EEE, MMM d')}`
    : `Date cleared for ${quote(r.title)}`;
  showToast(message, () => get().revert([r]));
}

/** Drop target handler: a priority zone. `placeAt` puts it at that row's spot (manual sort). */
export function setPriority(id: string, priority: Priority, placeAt?: string) {
  const r = get().reminders.find((x) => x.id === id);
  if (!r || r.status === 'done' || r.priority === priority) return;
  // Reordering touches the whole section, so undo restores all of it.
  const before = get().reminders.filter((x) => x.status === r.status);
  if (placeAt) {
    // Move within the list as shown during the drag, so it lands where the preview put it.
    const ids = getVisible(r.status).map((x) => x.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(placeAt);
    if (from !== -1 && to !== -1) get().reorder(arrayMove(ids, from, to));
  }
  get().update(id, { priority });
  showToast(`Priority: ${PRIORITY_NAME[priority]}`, () => get().revert(before));
}

const WHO_RE = /^(.*\S)\s+@(\S.*)$/;

/** Parses "Contract draft @Alice" into title + who (Awaiting Reply only). */
export function parseQuickAdd(text: string, section: OpenStatus): { title: string; waitingOn: string } {
  const trimmed = text.trim();
  if (section === 'waiting') {
    const m = trimmed.match(WHO_RE);
    if (m) return { title: m[1], waitingOn: m[2].trim() };
  }
  return { title: trimmed, waitingOn: '' };
}

/** Calendar quick add: a trailing "@name" makes it an Awaiting Reply item. */
export function parseCalendarAdd(text: string): { title: string; status: OpenStatus; waitingOn: string } {
  const trimmed = text.trim();
  const m = trimmed.match(WHO_RE);
  if (m) return { title: m[1], status: 'waiting', waitingOn: m[2].trim() };
  return { title: trimmed, status: 'todo', waitingOn: '' };
}
