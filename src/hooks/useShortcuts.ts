import { useEffect } from 'react';
import { deleteReminder, toggleDone, toggleWaiting } from '../actions';
import { goToToday, setTab, setView, shiftSelectedDate, useStore, useUI } from '../store';
import { SECTIONS } from '../types';
import { getAgendaList, getVisible } from './useVisible';

export function focusById(id: string) {
  // Wait for the element to render (e.g. after switching tabs or opening search).
  setTimeout(() => document.getElementById(id)?.focus());
}

function scrollToSelected() {
  setTimeout(() => document.querySelector('.item.selected')?.scrollIntoView({ block: 'nearest' }));
}

const inCalendar = () => useStore.getState().settings.view === 'calendar';

/** Rows the selection moves through: the day agenda in the calendar, else the section list. */
function currentList() {
  return inCalendar() ? getAgendaList() : getVisible(useUI.getState().tab);
}

/** Runs an action on the selected item, then selects its neighbour. */
function actOnSelected(action: (id: string) => void) {
  const { selectedId } = useUI.getState();
  if (!selectedId) return;
  const before = currentList();
  const index = before.findIndex((r) => r.id === selectedId);
  action(selectedId);
  const after = currentList();
  if (after.some((r) => r.id === selectedId)) return;
  const next = after[Math.min(index, after.length - 1)];
  useUI.setState({ selectedId: next?.id ?? null });
}

function moveSelection(delta: number) {
  const { selectedId } = useUI.getState();
  const list = currentList();
  if (!list.length) return;
  const index = list.findIndex((r) => r.id === selectedId);
  const next =
    index === -1 ? (delta > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, index + delta));
  useUI.setState({ selectedId: list[next].id });
  scrollToSelected();
}

function nudgeSelected(delta: number) {
  const { tab, selectedId } = useUI.getState();
  if (inCalendar() || tab === 'done' || !selectedId) return;
  if (useStore.getState().settings.sort[tab] !== 'manual') return;
  const ids = getVisible(tab).map((r) => r.id);
  const i = ids.indexOf(selectedId);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  useStore.getState().reorder(ids);
  scrollToSelected();
}

function handleEscape(target: HTMLElement) {
  // Dialogs close themselves.
  if (target.closest('.dialog')) return;
  const ui = useUI.getState();
  if (ui.helpOpen || ui.menuOpen) {
    useUI.setState({ helpOpen: false, menuOpen: false });
    return;
  }
  if (target.id === 'search') {
    useUI.setState({ searchOpen: false, query: '' });
    return;
  }
  if (target.closest('.item')) {
    useUI.setState({ expandedId: null });
    target.closest<HTMLElement>('.item')?.querySelector<HTMLElement>('.row-main, .title-input')?.blur();
    return;
  }
  if (target.matches('input, textarea, select')) {
    target.blur();
    return;
  }
  if (ui.expandedId) useUI.setState({ expandedId: null });
  else if (ui.selectedId) useUI.setState({ selectedId: null });
  else if (ui.searchOpen) useUI.setState({ searchOpen: false, query: '' });
}

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === 'Escape') {
        handleEscape(target);
        return;
      }
      if (e.defaultPrevented || e.isComposing) return;

      // Undo the last toast action.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const typing = target.closest('input, textarea, select, [contenteditable="true"]');
        const toast = useUI.getState().toast;
        if (!typing && toast?.undo) {
          e.preventDefault();
          toast.undo();
          useUI.setState({ toast: null });
        }
        return;
      }

      if (target.closest('input, textarea, select, [contenteditable="true"], .dialog')) return;
      if (e.metaKey || e.ctrlKey) return;
      const ui = useUI.getState();
      if (ui.helpOpen || ui.pendingImport) return;

      if (e.altKey) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          nudgeSelected(e.key === 'ArrowUp' ? -1 : 1);
        }
        return;
      }

      const onButton = !!target.closest('button, a, [role="tab"], [role="button"]');

      if (inCalendar()) {
        const nav: Record<string, () => void> = {
          ArrowLeft: () => shiftSelectedDate('day', -1),
          ArrowRight: () => shiftSelectedDate('day', 1),
          ArrowUp: () => shiftSelectedDate('day', -7),
          ArrowDown: () => shiftSelectedDate('day', 7),
          '[': () => shiftSelectedDate('month', -1),
          ']': () => shiftSelectedDate('month', 1),
          t: goToToday,
        };
        if (nav[e.key]) {
          e.preventDefault();
          nav[e.key]();
          return;
        }
      }

      switch (e.key) {
        case 'c':
          setView(inCalendar() ? 'list' : 'calendar');
          break;
        case 'n':
          e.preventDefault();
          if (!inCalendar() && ui.tab === 'done') setTab('todo');
          focusById('quick-add');
          break;
        case '/':
          e.preventDefault();
          useUI.setState({ searchOpen: true });
          focusById('search');
          break;
        case '1':
        case '2':
        case '3':
          setTab(SECTIONS[Number(e.key) - 1]);
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          moveSelection(1);
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          moveSelection(-1);
          break;
        case 'Enter':
        case 'e':
          if (e.key === 'Enter' && onButton) return;
          if (ui.selectedId) {
            e.preventDefault();
            useUI.setState({ expandedId: ui.expandedId === ui.selectedId ? null : ui.selectedId });
          }
          break;
        case 'x':
          actOnSelected(toggleDone);
          break;
        case 'w':
          actOnSelected(toggleWaiting);
          break;
        case 'Delete':
        case 'Backspace':
          if (ui.selectedId) {
            e.preventDefault();
            actOnSelected(deleteReminder);
          }
          break;
        case '?':
          useUI.setState({ helpOpen: true, menuOpen: false });
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
