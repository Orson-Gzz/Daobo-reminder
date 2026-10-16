import { format } from 'date-fns';
import { useState, type FormEvent } from 'react';
import { parseCalendarAdd, parseQuickAdd } from '../actions';
import { PlusIcon } from '../icons';
import { parseDateKey } from '../lib/dates';
import { expandZone, useStore, useUI } from '../store';
import type { OpenStatus } from '../types';
import { useIconAnimation } from './ui';

const PLACEHOLDER: Record<OpenStatus, string> = {
  todo: 'Add a reminder',
  waiting: 'Waiting to hear back about… (add @name for who)',
};

/** List view: adds to `section`. Calendar view: adds a reminder dated `dueDate`. */
type Props = { section: OpenStatus; dueDate?: undefined } | { section?: undefined; dueDate: string };

export function QuickAdd({ section, dueDate }: Props) {
  const [text, setText] = useState('');
  const { ref, triggers } = useIconAnimation();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = dueDate
      ? parseCalendarAdd(text)
      : { ...parseQuickAdd(text, section!), status: section! };
    if (!parsed.title) return;
    useStore.getState().add({ ...parsed, dueDate: dueDate ?? null });
    // New items land in the None zone; unfold it so they show.
    if (section) expandZone(section, 0);
    setText('');
    // A new item could be hidden by an active search; clear it so the item shows.
    if (useUI.getState().query) useUI.setState({ query: '', searchOpen: false });
  };

  const dayLabel = dueDate ? format(parseDateKey(dueDate), 'MMM d') : '';
  return (
    <form className="quick-add" onSubmit={submit} {...triggers}>
      <span className="quick-add-plus" aria-hidden>
        <PlusIcon ref={ref} size={16} />
      </span>
      <input
        id="quick-add"
        aria-label={
          dueDate ? `Add to ${dayLabel}` : section === 'waiting' ? 'Add to Awaiting Reply' : 'Add to To-do'
        }
        placeholder={dueDate ? `Add to ${dayLabel} (@name for awaiting reply)` : PLACEHOLDER[section!]}
        autoComplete="off"
        enterKeyHint="done"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </form>
  );
}
