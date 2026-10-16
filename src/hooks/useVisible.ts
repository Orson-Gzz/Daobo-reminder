import { useMemo } from 'react';
import { agendaFor, calendarReminders } from '../lib/calendar';
import { matchesQuery, priorityZones, visibleReminders } from '../lib/sort';
import { useStore, useUI } from '../store';
import type { OpenStatus, Status } from '../types';

export function useVisible(section: Status) {
  const reminders = useStore((s) => s.reminders);
  const sort = useStore((s) => s.settings.sort);
  const collapsed = useStore((s) => s.settings.collapsedZones);
  const query = useUI((s) => s.query);
  const now = useUI((s) => s.now);
  return useMemo(
    () => visibleReminders(reminders, section, query, sort, now, collapsed),
    [reminders, section, query, sort, now, collapsed],
  );
}

/** All four priority zones of a section (search applied, collapsed ones included). */
export function useZones(section: OpenStatus) {
  const reminders = useStore((s) => s.reminders);
  const mode = useStore((s) => s.settings.sort[section]);
  const query = useUI((s) => s.query);
  return useMemo(
    () =>
      priorityZones(
        reminders.filter((r) => r.status === section && matchesQuery(r, query)),
        mode,
      ),
    [reminders, section, query, mode],
  );
}

/** Current visible list read outside React (keyboard shortcuts, drag end). */
export function getVisible(section: Status) {
  const { reminders, settings } = useStore.getState();
  const { query, now } = useUI.getState();
  return visibleReminders(reminders, section, query, settings.sort, now, settings.collapsedZones);
}

/** Open reminders shown in the calendar (section toggles + search applied). */
export function useCalendarReminders() {
  const reminders = useStore((s) => s.reminders);
  const show = useStore((s) => s.settings.calendarShow);
  const query = useUI((s) => s.query);
  return useMemo(() => calendarReminders(reminders, { show, query }), [reminders, show, query]);
}

/** Agenda rows in display order (overdue, then the day), for keyboard navigation. */
export function getAgendaList() {
  const { reminders, settings } = useStore.getState();
  const { query, now, selectedDate } = useUI.getState();
  const { overdue, items } = agendaFor(
    calendarReminders(reminders, { show: settings.calendarShow, query }),
    selectedDate,
    now,
  );
  return [...overdue, ...items];
}
