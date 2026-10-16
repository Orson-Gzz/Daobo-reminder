import { useEffect } from 'react';
import { isOverdue } from '../lib/dates';
import { openReminder, STORAGE_KEY, useStore, useUI } from '../store';

const TICK_MS = 20_000;

/** Advances the shared clock so due labels and notifications stay current. */
export function useClock() {
  useEffect(() => {
    const tick = () => useUI.setState({ now: Date.now() });
    const id = setInterval(tick, TICK_MS);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}

/** Keeps other tabs in sync and handles "open this reminder" requests. */
export function useStorageSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) void useStore.persist.rehydrate();
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'open-reminder' && typeof e.data.id === 'string') openReminder(e.data.id);
    };
    window.addEventListener('storage', onStorage);
    navigator.serviceWorker?.addEventListener('message', onMessage);

    const params = new URLSearchParams(location.search);
    const open = params.get('open');
    if (open) {
      openReminder(open);
      history.replaceState(null, '', location.pathname);
    }
    return () => {
      window.removeEventListener('storage', onStorage);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);
}

const THEME_COLORS = { light: '#ffffff', dark: '#141416' };

/** Theme attribute, browser chrome color, overdue count in the title and app badge. */
export function useDocumentState() {
  const theme = useStore((s) => s.settings.theme);
  const reminders = useStore((s) => s.reminders);
  const now = useUI((s) => s.now);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.append(meta);
      }
      meta.content = dark ? THEME_COLORS.dark : THEME_COLORS.light;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const overdue = reminders.filter((r) => r.status !== 'done' && isOverdue(r, now)).length;
  useEffect(() => {
    document.title = overdue ? `(${overdue}) Reminders` : 'Reminders';
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (overdue) nav.setAppBadge?.(overdue).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [overdue]);
}
