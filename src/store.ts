import { addDays, addMonths } from 'date-fns';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeList } from './lib/backup';
import { nextOccurrence, parseDateKey, toDateKey } from './lib/dates';
import type { OpenStatus, Priority, Reminder, Settings, SortMode, Status, View } from './types';

export type Undo = () => void;

export const STORAGE_KEY = 'reminders';

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  notifications: false,
  sort: { todo: 'manual', waiting: 'manual' },
  view: 'list',
  weekStart: 1,
  calendarShow: { todo: true, waiting: true },
  collapsedZones: { todo: [], waiting: [] },
};

/** Older saves may still use the removed "priority" sort; zones already group by priority. */
const normalizeSort = (sort?: Partial<Record<OpenStatus, string>>): Record<OpenStatus, SortMode> => {
  const pick = (mode?: string): SortMode => (mode === 'due' || mode === 'priority' ? 'due' : 'manual');
  return { todo: pick(sort?.todo), waiting: pick(sort?.waiting) };
};

interface ReminderState {
  reminders: Reminder[];
  settings: Settings;
  add: (input: { title: string; status: OpenStatus; waitingOn?: string; dueDate?: string | null }) => Reminder;
  update: (id: string, patch: Partial<Omit<Reminder, 'id'>>) => void;
  /** Move to To-do / Awaiting Reply. Also restores completed reminders. */
  move: (id: string, to: OpenStatus) => Undo | null;
  /** Repeating reminders stay put with their next date; a completed copy is logged. */
  complete: (id: string) => { undo: Undo; next: string | null } | null;
  restore: (id: string) => void;
  remove: (ids: string[]) => Undo | null;
  /** Reassign manual order so `ids` appear in the given sequence. */
  reorder: (ids: string[]) => void;
  markNotified: (ids: string[]) => void;
  clearCompleted: () => Undo | null;
  importReminders: (items: Reminder[], mode: 'merge' | 'replace') => Undo;
  /** Put back `prev` versions (by id) and drop `added` ids. Backs every undo. */
  revert: (prev: Reminder[], added?: string[]) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setSort: (section: OpenStatus, mode: SortMode) => void;
  toggleZone: (section: OpenStatus, priority: Priority) => void;
}

const nowIso = () => new Date().toISOString();
const topOrder = (list: Reminder[]) =>
  list.length ? Math.min(...list.map((r) => r.order)) - 1 : 0;

export const useStore = create<ReminderState>()(
  persist(
    (set, get) => {
      const find = (id: string) => get().reminders.find((r) => r.id === id);
      const patchOne = (id: string, patch: Partial<Reminder>) =>
        set((s) => ({
          reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));

      return {
        reminders: [],
        settings: DEFAULT_SETTINGS,

        add: ({ title, status, waitingOn = '', dueDate = null }) => {
          const ts = nowIso();
          const reminder: Reminder = {
            id: crypto.randomUUID(),
            title: title.trim(),
            notes: '',
            status,
            prevStatus: status,
            dueDate,
            dueTime: null,
            priority: 0,
            repeat: 'none',
            waitingOn,
            waitingSince: status === 'waiting' ? ts : null,
            completedAt: null,
            notifiedAt: null,
            order: topOrder(get().reminders),
            createdAt: ts,
            updatedAt: ts,
          };
          set((s) => ({ reminders: [reminder, ...s.reminders] }));
          return reminder;
        },

        update: (id, patch) => {
          const r = find(id);
          if (!r) return;
          const next: Partial<Reminder> = { ...patch, updatedAt: nowIso() };
          if ('dueDate' in patch && !patch.dueDate) next.dueTime = null;
          if (
            ('dueDate' in patch && patch.dueDate !== r.dueDate) ||
            ('dueTime' in patch && patch.dueTime !== r.dueTime)
          ) {
            next.notifiedAt = null;
          }
          patchOne(id, next);
        },

        move: (id, to) => {
          const r = find(id);
          if (!r || r.status === to) return null;
          const ts = nowIso();
          const keepSince = r.status === 'done' && r.prevStatus === 'waiting' && r.waitingSince;
          patchOne(id, {
            status: to,
            prevStatus: to,
            completedAt: null,
            waitingSince: to === 'waiting' ? (keepSince ? r.waitingSince : ts) : null,
            order: topOrder(get().reminders),
            updatedAt: ts,
          });
          return () => get().revert([r]);
        },

        complete: (id) => {
          const r = find(id);
          if (!r || r.status === 'done') return null;
          const ts = nowIso();

          if (r.repeat !== 'none') {
            const next = nextOccurrence(r.dueDate, r.repeat);
            const log: Reminder = {
              ...r,
              id: crypto.randomUUID(),
              status: 'done',
              prevStatus: r.status,
              repeat: 'none',
              completedAt: ts,
              updatedAt: ts,
            };
            set((s) => ({
              reminders: [
                ...s.reminders.map((x) =>
                  x.id === id ? { ...x, dueDate: next, notifiedAt: null, updatedAt: ts } : x,
                ),
                log,
              ],
            }));
            return { undo: () => get().revert([r], [log.id]), next };
          }

          patchOne(id, { status: 'done', prevStatus: r.status, completedAt: ts, updatedAt: ts });
          return { undo: () => get().revert([r]), next: null };
        },

        restore: (id) => {
          const r = find(id);
          if (r?.status === 'done') get().move(id, r.prevStatus);
        },

        remove: (ids) => {
          const set_ = new Set(ids);
          const removed = get().reminders.filter((r) => set_.has(r.id));
          if (!removed.length) return null;
          set((s) => ({ reminders: s.reminders.filter((r) => !set_.has(r.id)) }));
          return () => get().revert(removed);
        },

        reorder: (ids) => {
          const byId = new Map(get().reminders.map((r) => [r.id, r]));
          const slots = ids
            .map((id) => byId.get(id)?.order)
            .filter((o): o is number => o !== undefined)
            .sort((a, b) => a - b);
          const newOrder = new Map(ids.map((id, i) => [id, slots[i]]));
          set((s) => ({
            reminders: s.reminders.map((r) =>
              newOrder.has(r.id) ? { ...r, order: newOrder.get(r.id)! } : r,
            ),
          }));
        },

        markNotified: (ids) => {
          const ts = nowIso();
          const set_ = new Set(ids);
          set((s) => ({
            reminders: s.reminders.map((r) => (set_.has(r.id) ? { ...r, notifiedAt: ts } : r)),
          }));
        },

        clearCompleted: () =>
          get().remove(get().reminders.filter((r) => r.status === 'done').map((r) => r.id)),

        importReminders: (items, mode) => {
          const current = get().reminders;
          if (mode === 'replace') {
            set({ reminders: items });
            return () => get().revert(current, items.map((r) => r.id));
          }
          const incoming = new Map(items.map((r) => [r.id, r]));
          const overwritten = current.filter((r) => incoming.has(r.id));
          const existing = new Set(current.map((r) => r.id));
          const added = items.filter((r) => !existing.has(r.id));
          set({
            reminders: [...current.map((r) => incoming.get(r.id) ?? r), ...added],
          });
          return () => get().revert(overwritten, added.map((r) => r.id));
        },

        revert: (prev, added = []) => {
          const drop = new Set(added);
          const prevById = new Map(prev.map((r) => [r.id, r]));
          set((s) => {
            const kept = s.reminders
              .filter((r) => !drop.has(r.id) || prevById.has(r.id))
              .map((r) => prevById.get(r.id) ?? r);
            const present = new Set(kept.map((r) => r.id));
            return { reminders: [...kept, ...prev.filter((r) => !present.has(r.id))] };
          });
        },

        setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        setSort: (section, mode) =>
          set((s) => ({
            settings: { ...s.settings, sort: { ...s.settings.sort, [section]: mode } },
          })),
        toggleZone: (section, priority) =>
          set((s) => {
            const current = s.settings.collapsedZones[section];
            const next = current.includes(priority)
              ? current.filter((p) => p !== priority)
              : [...current, priority];
            return {
              settings: { ...s.settings, collapsedZones: { ...s.settings.collapsedZones, [section]: next } },
            };
          }),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ reminders: s.reminders, settings: s.settings }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<ReminderState, 'reminders' | 'settings'>>;
        return {
          ...current,
          reminders: normalizeList(p.reminders),
          settings: {
            ...DEFAULT_SETTINGS,
            ...p.settings,
            sort: normalizeSort(p.settings?.sort),
            calendarShow: { ...DEFAULT_SETTINGS.calendarShow, ...p.settings?.calendarShow },
            collapsedZones: { ...DEFAULT_SETTINGS.collapsedZones, ...p.settings?.collapsedZones },
          },
        };
      },
    },
  ),
);

export interface Toast {
  id: number;
  message: string;
  undo?: Undo;
}

interface UIState {
  tab: Status;
  query: string;
  searchOpen: boolean;
  expandedId: string | null;
  selectedId: string | null;
  menuOpen: boolean;
  helpOpen: boolean;
  toast: Toast | null;
  /** Parsed backup waiting for the merge/replace choice. */
  pendingImport: Reminder[] | null;
  /** Shared clock so due/overdue labels refresh without a reload. */
  now: number;
  /** Calendar: selected day (`YYYY-MM-DD`); the visible month follows it. */
  selectedDate: string;
}

export const useUI = create<UIState>()(() => ({
  tab: 'todo',
  query: '',
  searchOpen: false,
  expandedId: null,
  selectedId: null,
  menuOpen: false,
  helpOpen: false,
  toast: null,
  pendingImport: null,
  now: Date.now(),
  selectedDate: toDateKey(new Date()),
}));

let toastSeq = 0;
export function showToast(message: string, undo?: Undo | null) {
  useUI.setState({ toast: { id: ++toastSeq, message, undo: undo ?? undefined } });
}

export function setView(view: View) {
  useStore.getState().setSettings({ view });
  useUI.setState({ expandedId: null, selectedId: null, menuOpen: false });
}

/** Switch to a list section (leaving the calendar if needed). */
export function setTab(tab: Status) {
  if (useStore.getState().settings.view !== 'list') useStore.getState().setSettings({ view: 'list' });
  useUI.setState({ tab, expandedId: null, selectedId: null });
}

/** Unfold a priority zone so an item in it can be seen. */
export function expandZone(section: OpenStatus, priority: Priority) {
  const { settings, toggleZone } = useStore.getState();
  if (settings.collapsedZones[section].includes(priority)) toggleZone(section, priority);
}

export function selectDate(dateKey: string) {
  if (useUI.getState().selectedDate === dateKey) return;
  useUI.setState({ selectedDate: dateKey, expandedId: null, selectedId: null });
}

/** Calendar navigation relative to the selected day. */
export function shiftSelectedDate(unit: 'day' | 'month', delta: number) {
  const date = parseDateKey(useUI.getState().selectedDate);
  selectDate(toDateKey(unit === 'day' ? addDays(date, delta) : addMonths(date, delta)));
}

export function goToToday() {
  selectDate(toDateKey(new Date()));
}

/** Jump to a reminder and open it (used by notification clicks and calendar chips). */
export function openReminder(id: string) {
  const r = useStore.getState().reminders.find((x) => x.id === id);
  if (!r) return;
  const ui = { query: '', searchOpen: false, expandedId: id, selectedId: id };
  if (r.status !== 'done') expandZone(r.status, r.priority);
  if (useStore.getState().settings.view === 'calendar' && r.dueDate && r.status !== 'done') {
    useUI.setState({ ...ui, selectedDate: r.dueDate });
  } else {
    if (useStore.getState().settings.view !== 'list') useStore.getState().setSettings({ view: 'list' });
    useUI.setState({ ...ui, tab: r.status });
  }
}
