import { useDroppable } from '@dnd-kit/core';
import type { KeyboardEvent } from 'react';
import { isOverdue } from '../lib/dates';
import { matchesQuery } from '../lib/sort';
import { setTab, useStore, useUI } from '../store';
import { SECTION_NAME, SECTIONS, type Status } from '../types';
import { cx } from './ui';

export const TAB_DROP_PREFIX = 'tab:';

function Tab({ section, count, overdue }: { section: Status; count: number; overdue: number }) {
  const active = useUI((s) => s.tab === section);
  const { setNodeRef, isOver, active: dragging } = useDroppable({ id: TAB_DROP_PREFIX + section });

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = SECTIONS.indexOf(section) + (e.key === 'ArrowRight' ? 1 : -1);
    const next = SECTIONS[(i + SECTIONS.length) % SECTIONS.length];
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <button
      ref={setNodeRef}
      id={`tab-${section}`}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls="panel"
      tabIndex={active ? 0 : -1}
      className={cx('tab', active && 'active', isOver && 'drop-over', dragging && !active && 'drop-target')}
      onClick={() => setTab(section)}
      onKeyDown={onKeyDown}
    >
      <span>{SECTION_NAME[section]}</span>
      <span className="count">{count}</span>
      {overdue > 0 && <span className="overdue-dot" title={`${overdue} overdue`} aria-label={`${overdue} overdue`} />}
    </button>
  );
}

export function Tabs() {
  const reminders = useStore((s) => s.reminders);
  const query = useUI((s) => s.query);
  const now = useUI((s) => s.now);

  const counts = { todo: 0, waiting: 0, done: 0 };
  const overdue = { todo: 0, waiting: 0, done: 0 };
  for (const r of reminders) {
    if (!matchesQuery(r, query)) continue;
    counts[r.status]++;
    if (r.status !== 'done' && isOverdue(r, now)) overdue[r.status]++;
  }

  return (
    <nav className="tabs" role="tablist" aria-label="Sections">
      {SECTIONS.map((s) => (
        <Tab key={s} section={s} count={counts[s]} overdue={overdue[s]} />
      ))}
    </nav>
  );
}
