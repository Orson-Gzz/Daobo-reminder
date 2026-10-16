import { useEffect } from 'react';
import { dueTimestamp, formatDue } from '../lib/dates';
import { openReminder, showToast, useStore, useUI } from '../store';
import type { Reminder } from '../types';

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

/** Open reminders whose due moment has passed and that haven't alerted yet. */
export function collectDue(reminders: Reminder[], now: number): Reminder[] {
  return reminders.filter((r) => {
    if (r.status === 'done' || r.notifiedAt) return false;
    const ts = dueTimestamp(r);
    return ts !== null && ts <= now;
  });
}

const ICON = `${import.meta.env.BASE_URL}pwa-192x192.png`;

async function show(title: string, body: string, id?: string) {
  const options: NotificationOptions = { body, icon: ICON, badge: ICON, tag: id, data: { id } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.active) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    // Fall through to the page-level API.
  }
  const n = new Notification(title, options);
  n.onclick = () => {
    window.focus();
    if (id) openReminder(id);
    n.close();
  };
}

function describe(r: Reminder): string {
  if (r.status === 'waiting') {
    return r.waitingOn ? `Follow up with ${r.waitingOn}` : 'Time to follow up';
  }
  return r.notes.split('\n')[0] || `Due ${formatDue(r)}`;
}

/**
 * Fires a notification for each reminder as it comes due. Runs on every clock
 * tick (and when the tab regains focus) while the app is open.
 */
export function useNotifications() {
  const enabled = useStore((s) => s.settings.notifications);
  const now = useUI((s) => s.now);

  useEffect(() => {
    if (!enabled || !notificationsSupported() || Notification.permission !== 'granted') return;
    const { reminders, markNotified } = useStore.getState();
    const due = collectDue(reminders, now);
    if (!due.length) return;
    markNotified(due.map((r) => r.id));
    if (due.length > 3) {
      void show(`${due.length} reminders due`, due.map((r) => r.title).join(' · '));
    } else {
      for (const r of due) void show(r.title, describe(r), r.id);
    }
  }, [enabled, now]);
}

export async function enableNotifications() {
  if (!notificationsSupported()) {
    showToast('This browser doesn’t support notifications.');
    return;
  }
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== 'granted') {
    showToast('Notifications are blocked. Allow them in this site’s browser settings.');
    return;
  }
  const { reminders, markNotified, setSettings } = useStore.getState();
  // Already-overdue items are visible in the app; only alert for what comes due next.
  markNotified(collectDue(reminders, Date.now()).map((r) => r.id));
  setSettings({ notifications: true });
  showToast('Notifications on');
}
