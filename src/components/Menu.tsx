import { useEffect, useRef, type ButtonHTMLAttributes, type ChangeEvent, type ReactNode } from 'react';
import { clearCompleted } from '../actions';
import { enableNotifications, notificationsSupported } from '../hooks/useNotifications';
import {
  BellIcon,
  DownloadIcon,
  KeyboardIcon,
  SettingsIcon,
  Trash2Icon,
  UploadIcon,
  type AnimatedIcon,
} from '../icons';
import { BackupError, downloadBackup, parseBackup } from '../lib/backup';
import { showToast, useStore, useUI } from '../store';
import type { SortMode, Theme, WeekStart } from '../types';
import { NavItem } from './NavItem';
import { Segmented, useIconAnimation } from './ui';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'due', label: 'Due date' },
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

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: AnimatedIcon;
  label: string;
  /** Trailing content: a count, a key hint or a switch. */
  end?: ReactNode;
}

function MenuItem({ icon: Icon, label, end, ...rest }: MenuItemProps) {
  const { ref, triggers } = useIconAnimation();
  return (
    <button type="button" className="menu-item" {...triggers} {...rest}>
      <Icon ref={ref} size={16} aria-hidden />
      <span className="menu-item-label">{label}</span>
      {end}
    </button>
  );
}

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
      <NavItem
        icon={SettingsIcon}
        label="Settings"
        className="nav-settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        active={open}
        onClick={() => useUI.setState({ menuOpen: !open })}
      />
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
          <MenuItem
            icon={BellIcon}
            label="Notifications"
            role="switch"
            aria-checked={settings.notifications}
            disabled={!notificationsSupported()}
            onClick={toggleNotifications}
            end={<span className="switch" aria-hidden />}
          />
          <hr />
          <MenuItem
            icon={DownloadIcon}
            label="Export backup"
            onClick={() => {
              downloadBackup(useStore.getState().reminders);
              close();
            }}
          />
          <MenuItem icon={UploadIcon} label="Import backup…" onClick={() => fileRef.current?.click()} />
          <MenuItem
            icon={Trash2Icon}
            label="Clear completed"
            disabled={!doneCount}
            onClick={() => {
              clearCompleted();
              close();
            }}
            end={doneCount > 0 && <span className="menu-hint">{doneCount}</span>}
          />
          <hr />
          <MenuItem
            icon={KeyboardIcon}
            label="Keyboard shortcuts"
            onClick={() => useUI.setState({ helpOpen: true, menuOpen: false, navOpen: false })}
            end={<kbd className="menu-hint">?</kbd>}
          />
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
