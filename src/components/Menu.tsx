import { Bell, Download, Keyboard, MoreHorizontal, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, type ChangeEvent } from 'react';
import { clearCompleted } from '../actions';
import { enableNotifications, notificationsSupported } from '../hooks/useNotifications';
import { BackupError, downloadBackup, parseBackup } from '../lib/backup';
import { showToast, useStore, useUI } from '../store';
import type { SortMode, Theme, WeekStart } from '../types';
import { IconButton, Segmented } from './ui';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
];

const WEEK_START_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: 1, label: 'Mon' },
  { value: 0, label: 'Sun' },
];

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Menu() {
  const open = useUI((s) => s.menuOpen);
  const tab = useUI((s) => s.tab);
  const settings = useStore((s) => s.settings);
  const doneCount = useStore((s) => s.reminders.filter((r) => r.status === 'done').length);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) useUI.setState({ menuOpen: false });
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const close = () => useUI.setState({ menuOpen: false });

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const reminders = parseBackup(await file.text());
      useUI.setState({ pendingImport: reminders });
    } catch (err) {
      showToast(err instanceof BackupError ? err.message : 'Couldn’t read that file.');
    }
  };

  const toggleNotifications = () => {
    if (settings.notifications) useStore.getState().setSettings({ notifications: false });
    else void enableNotifications();
  };

  return (
    <div className="menu-wrap" ref={wrapRef}>
      <IconButton
        label="Menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => useUI.setState({ menuOpen: !open })}
      >
        <MoreHorizontal size={18} />
      </IconButton>
      {open && (
        <div className="menu" role="dialog" aria-label="Options">
          {settings.view === 'calendar' ? (
            <div className="menu-row">
              <span className="menu-label">Week starts</span>
              <Segmented
                label="Week starts on"
                value={settings.weekStart}
                options={WEEK_START_OPTIONS}
                onChange={(weekStart) => useStore.getState().setSettings({ weekStart })}
              />
            </div>
          ) : tab !== 'done' ? (
            <div className="menu-row">
              <span className="menu-label">Sort</span>
              <Segmented
                label="Sort this section"
                value={settings.sort[tab]}
                options={SORT_OPTIONS}
                onChange={(mode) => useStore.getState().setSort(tab, mode)}
              />
            </div>
          ) : null}
          <div className="menu-row">
            <span className="menu-label">Theme</span>
            <Segmented
              label="Theme"
              value={settings.theme}
              options={THEME_OPTIONS}
              onChange={(theme) => useStore.getState().setSettings({ theme })}
            />
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.notifications}
            className="menu-item"
            disabled={!notificationsSupported()}
            onClick={toggleNotifications}
          >
            <Bell size={16} aria-hidden />
            <span>Notifications</span>
            <span className="switch" aria-hidden />
          </button>
          <hr />
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              downloadBackup(useStore.getState().reminders);
              close();
            }}
          >
            <Download size={16} aria-hidden />
            <span>Export backup</span>
          </button>
          <button type="button" className="menu-item" onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden />
            <span>Import backup…</span>
          </button>
          <button
            type="button"
            className="menu-item"
            disabled={!doneCount}
            onClick={() => {
              clearCompleted();
              close();
            }}
          >
            <Trash2 size={16} aria-hidden />
            <span>Clear completed</span>
            {doneCount > 0 && <span className="menu-hint">{doneCount}</span>}
          </button>
          <hr />
          <button
            type="button"
            className="menu-item"
            onClick={() => useUI.setState({ helpOpen: true, menuOpen: false })}
          >
            <Keyboard size={16} aria-hidden />
            <span>Keyboard shortcuts</span>
            <kbd className="menu-hint">?</kbd>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onFile}
          />
        </div>
      )}
    </div>
  );
}
