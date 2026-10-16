import { CheckCircle2, Hourglass, ListTodo, SearchX } from 'lucide-react';
import { useUI } from '../store';
import type { Status } from '../types';

const COPY: Record<Status, { icon: typeof ListTodo; title: string; hint: string }> = {
  todo: { icon: ListTodo, title: 'All clear', hint: 'Add a reminder above, or press N.' },
  waiting: {
    icon: Hourglass,
    title: 'Not waiting on anyone',
    hint: 'Track things you’re waiting to hear back about. Add @name to note who.',
  },
  done: { icon: CheckCircle2, title: 'Nothing completed yet', hint: 'Finished reminders show up here.' },
};

export function EmptyState({ section }: { section: Status }) {
  const query = useUI((s) => s.query.trim());
  const { icon: Icon, title, hint } = query
    ? { icon: SearchX, title: 'No matches', hint: `Nothing here matches “${query}”.` }
    : COPY[section];
  return (
    <div className="empty">
      <Icon size={28} strokeWidth={1.5} aria-hidden />
      <p className="empty-title">{title}</p>
      <p className="empty-hint">{hint}</p>
    </div>
  );
}
