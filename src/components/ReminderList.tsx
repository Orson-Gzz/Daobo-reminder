import { SortableContext, verticalListSortingStrategy, type SortingStrategy } from '@dnd-kit/sortable';
import { useMemo } from 'react';
import { useVisible } from '../hooks/useVisible';
import { groupCompleted } from '../lib/sort';
import { useStore, useUI } from '../store';
import type { OpenStatus } from '../types';
import { EmptyState } from './EmptyState';
import { ReminderItem } from './ReminderItem';

/** Items stay put while dragging (sorted views, Completed): only tab drops apply. */
export const staticStrategy: SortingStrategy = () => null;

export function ReminderList({ section }: { section: OpenStatus }) {
  const items = useVisible(section);
  const manual = useStore((s) => s.settings.sort[section] === 'manual');
  const ids = useMemo(() => items.map((r) => r.id), [items]);

  if (!items.length) return <EmptyState section={section} />;
  return (
    <SortableContext items={ids} strategy={manual ? verticalListSortingStrategy : staticStrategy}>
      <ul className="list">
        {items.map((r) => (
          <ReminderItem key={r.id} reminder={r} sortable={manual} />
        ))}
      </ul>
    </SortableContext>
  );
}

export function CompletedList() {
  const items = useVisible('done');
  const now = useUI((s) => s.now);
  const groups = useMemo(() => groupCompleted(items, now), [items, now]);
  const ids = useMemo(() => items.map((r) => r.id), [items]);

  if (!items.length) return <EmptyState section="done" />;
  return (
    <SortableContext items={ids} strategy={staticStrategy}>
      {groups.map((g) => (
        <section key={g.label} className="group" aria-label={g.label}>
          <h2 className="group-label">{g.label}</h2>
          <ul className="list">
            {g.items.map((r) => (
              <ReminderItem key={r.id} reminder={r} sortable={false} />
            ))}
          </ul>
        </section>
      ))}
    </SortableContext>
  );
}
