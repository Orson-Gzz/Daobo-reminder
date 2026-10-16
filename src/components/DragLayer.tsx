import {
  closestCenter,
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useState, type ReactNode } from 'react';
import { rescheduleReminder, sendToSection, setPriority } from '../actions';
import { getVisible } from '../hooks/useVisible';
import { DAY_DROP_PREFIX, NO_DATE_DROP_ID } from '../lib/calendar';
import { useStore, useUI } from '../store';
import type { Priority as PriorityLevel, Status } from '../types';
import { ChipLabel } from './MonthGrid';
import { Meta, Priority } from './ReminderItem';
import { ZONE_DROP_PREFIX } from './ReminderList';
import { TAB_DROP_PREFIX } from './Tabs';
import { cx } from './ui';

/** Section tabs, priority zone headers, calendar days and the No-date tray. */
const isZone = (id: string | number) => {
  const key = String(id);
  return key.startsWith(TAB_DROP_PREFIX) || key.startsWith(ZONE_DROP_PREFIX) || key.startsWith(DAY_DROP_PREFIX);
};

/** Drop zones win whenever the pointer is over one; otherwise snap to the nearest row. */
const collision: CollisionDetection = (args) => {
  const zone = pointerWithin(args).find((c) => isZone(c.id));
  if (zone) return [zone];
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => !isZone(c.id)),
  });
};

interface ActiveDrag {
  id: string;
  chip: boolean;
}

function DragPreview({ id, chip }: ActiveDrag) {
  const r = useStore((s) => s.reminders.find((x) => x.id === id));
  const now = useUI((s) => s.now);
  if (!r) return null;
  if (chip) {
    return (
      <div className={cx('cal-chip', 'drag-preview', r.status)}>
        <ChipLabel r={r} />
      </div>
    );
  }
  return (
    <div className="item drag-preview">
      <div className="row">
        <span className="check" aria-hidden />
        <span className="row-main">
          <span className="title">
            <Priority level={r.priority} />
            {r.title}
          </span>
          <Meta r={r} now={now} />
        </span>
      </div>
    </div>
  );
}

export function DragLayer({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const id = active.data.current?.reminderId ?? String(active.id);
    setActive({ id, chip: !!active.data.current?.chip });
    useUI.setState({ selectedId: id });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActive(null);
    if (!over) return;
    const id: string = active.data.current?.reminderId ?? String(active.id);
    const overId = String(over.id);

    if (overId.startsWith(TAB_DROP_PREFIX)) {
      const to = overId.slice(TAB_DROP_PREFIX.length) as Status;
      const r = useStore.getState().reminders.find((x) => x.id === id);
      if (r && r.status !== to) sendToSection(id, to);
      return;
    }

    if (overId.startsWith(DAY_DROP_PREFIX)) {
      rescheduleReminder(id, overId === NO_DATE_DROP_ID ? null : overId.slice(DAY_DROP_PREFIX.length));
      return;
    }

    if (overId.startsWith(ZONE_DROP_PREFIX)) {
      setPriority(id, Number(overId.slice(ZONE_DROP_PREFIX.length)) as PriorityLevel);
      return;
    }

    if (id === overId) return;
    const sortable = !!active.data.current?.sortable;
    // Dropped on a row in another zone: take that zone's priority (and that spot, if manual).
    const { reminders, settings } = useStore.getState();
    const r = reminders.find((x) => x.id === id);
    const target = reminders.find((x) => x.id === overId);
    const inList = settings.view === 'list' && r?.status !== 'done';
    if (inList && r && target && target.status === r.status && target.priority !== r.priority) {
      setPriority(id, target.priority, sortable ? overId : undefined);
      return;
    }

    if (!sortable) return;
    const ids = getVisible(useUI.getState().tab).map((x) => x.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(overId);
    if (from !== -1 && to !== -1) useStore.getState().reorder(arrayMove(ids, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>{active && <DragPreview {...active} />}</DragOverlay>
    </DndContext>
  );
}
