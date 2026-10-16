import { useEffect } from 'react';
import { CircleCheckIcon, HourglassIcon, ListChecksIcon, SearchXIcon, type AnimatedIcon } from '../icons';
import { useUI } from '../store';
import type { Status } from '../types';
import { cx, useIconAnimation } from './ui';

const COPY: Record<Status, { icon: AnimatedIcon; title: string; hint: string }> = {
  todo: { icon: ListChecksIcon, title: 'All clear', hint: 'Add a reminder above, or press N.' },
  waiting: {
    icon: HourglassIcon,
    title: 'Not waiting on anyone',
    hint: 'Track things you’re waiting to hear back about. Add @name to note who.',
  },
  done: { icon: CircleCheckIcon, title: 'Nothing completed yet', hint: 'Finished reminders show up here.' },
};

export function EmptyState({ section }: { section: Status }) {
  const query = useUI((s) => s.query.trim());
  const { ref, triggers } = useIconAnimation();
  const { icon: Icon, title, hint } = query
    ? { icon: SearchXIcon, title: 'No matches', hint: `Nothing here matches “${query}”.` }
    : COPY[section];

  // Play the icon once when the empty state appears.
  useEffect(() => {
    ref.current?.startAnimation();
  }, [ref, Icon]);

  return (
    <div className="empty">
      <span className={cx('empty-icon', query && 'muted')} onMouseEnter={triggers.onMouseEnter} aria-hidden>
        <Icon ref={ref} size={30} />
      </span>
      <p className="empty-title">{title}</p>
      <p className="empty-hint">{hint}</p>
    </div>
  );
}
