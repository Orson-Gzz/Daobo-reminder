import { useMemo } from 'react';
import { agendaFor, calendarReminders } from '../lib/calendar';
import { visibleReminders } from '../lib/sort';
import { useStore, useUI } from '../store';
import type { Status } from '../types';

export function useVisible(section: Status) {
  const reminders = useStore((s) => s.reminders);
  const sort = useStore((s) => s.settings.sort);
  const query = useUI((s) => s.query);
  const now = useUI((s) => s.now);
  return useMemo(
    () => visibleReminders(reminders, section, query, sort, now),
    [reminders, section, query, sort, now],
  );
}

/** Current visible list read outside React (keyboard shortcuts, drag end). */
export function getVisible(section: Status) {
  const { reminders, settings } = useStore.getState();
  const { query, now } = useUI.getState();
  return visibleReminders(reminders, section, query, settings.sort, now);
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
