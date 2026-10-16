import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, type SortingStrategy } from '@dnd-kit/sortable';
import { useMemo } from 'react';
import { useVisible, useZones } from '../hooks/useVisible';
import { ChevronRightIcon } from '../icons';
import { groupCompleted, type PriorityZone as Zone } from '../lib/sort';
import { useStore, useUI } from '../store';
import { PRIORITY_NAME, type OpenStatus } from '../types';
import { EmptyState } from './EmptyState';
import { Priority, ReminderItem } from './ReminderItem';
import { cx } from './ui';

export const ZONE_DROP_PREFIX = 'zone:';

/** Items stay put while dragging (sorted views, Completed): only tab and zone drops apply. */
export const staticStrategy: SortingStrategy = () => null;

export function ReminderList({ section }: { section: OpenStatus }) {
  const zones = useZones(section);
  const items = useVisible(section);
  const manual = useStore((s) => s.settings.sort[section] === 'manual');
  const collapsed = useStore((s) => s.settings.collapsedZones[section]);
  const searching = useUI((s) => !!s.query.trim());
  const ids = useMemo(() => items.map((r) => r.id), [items]);

  if (!zones.some((z) => z.items.length)) return <EmptyState section={section} />;
  return (
    <SortableContext items={ids} strategy={manual ? verticalListSortingStrategy : staticStrategy}>
      {zones.map((z) => (
        <PriorityZone
          key={z.priority}
          section={section}
          zone={z}
          open={searching || !collapsed.includes(z.priority)}
          sortable={manual}
        />
      ))}
    </SortableContext>
  );
}

interface ZoneProps {
  section: OpenStatus;
  zone: Zone;
  open: boolean;
  sortable: boolean;
}

/** One priority band. Its header (and empty slot) is a drop target that sets the priority. */
function PriorityZone({ section, zone: { priority, items }, open, sortable }: ZoneProps) {
  const name = PRIORITY_NAME[priority];
  const { setNodeRef, isOver, active } = useDroppable({ id: ZONE_DROP_PREFIX + priority });
  const draggedId: string | undefined = active?.data.current?.reminderId;
  // Highlight only zones the dragged item would actually move to.
  const target = !!draggedId && !items.some((r) => r.id === draggedId);

  return (
    <section className="zone" aria-label={priority ? `${name} priority` : 'No priority'}>
      <div ref={setNodeRef} className={cx('zone-drop', target && 'drop-target', target && isOver && 'drop-over')}>
        <button
          type="button"
          className="zone-head"
          aria-expanded={open}
          onClick={() => useStore.getState().toggleZone(section, priority)}
        >
          <ChevronRightIcon size={14} className="zone-caret" aria-hidden />
          <Priority level={priority} />
          <span>{name}</span>
          <span className="count">{items.length}</span>
        </button>
        {open && !items.length && <p className="zone-empty">Nothing here</p>}
      </div>
      {open && items.length > 0 && (
        <ul className="list">
          {items.map((r) => (
            <ReminderItem key={r.id} reminder={r} sortable={sortable} />
          ))}
        </ul>
      )}
    </section>
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
