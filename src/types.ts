export type Status = 'todo' | 'waiting' | 'done';
export type OpenStatus = Exclude<Status, 'done'>;
export type Priority = 0 | 1 | 2 | 3;
export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
/** Applied within each priority zone. */
export type SortMode = 'manual' | 'due';
export type Theme = 'system' | 'light' | 'dark';
export type View = 'list' | 'calendar';
/** 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1;

export interface Reminder {
  id: string;
  title: string;
  notes: string;
  status: Status;
  /** Section a completed reminder returns to when restored. */
  prevStatus: OpenStatus;
  /** Local date, `YYYY-MM-DD`. */
  dueDate: string | null;
  /** Local time, `HH:mm`. `null` means all-day. */
  dueTime: string | null;
  priority: Priority;
  repeat: Repeat;
  /** Who the reply is expected from (Awaiting Reply). */
  waitingOn: string;
  waitingSince: string | null;
  completedAt: string | null;
  /** Set once a notification fired; cleared whenever the due date/time changes. */
  notifiedAt: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: Theme;
  notifications: boolean;
  sort: Record<OpenStatus, SortMode>;
  view: View;
  weekStart: WeekStart;
  /** Which sections appear in the calendar. */
  calendarShow: Record<OpenStatus, boolean>;
  /** Priority zones folded away in each list section. */
  collapsedZones: Record<OpenStatus, Priority[]>;
}

export const SECTIONS: Status[] = ['todo', 'waiting', 'done'];

export const SECTION_NAME: Record<Status, string> = {
  todo: 'To-do',
  waiting: 'Awaiting Reply',
  done: 'Completed',
};

export const PRIORITY_NAME: Record<Priority, string> = {
  0: 'None',
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export const REPEAT_LABELS: Record<Repeat, string> = {
  none: 'Never',
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};
