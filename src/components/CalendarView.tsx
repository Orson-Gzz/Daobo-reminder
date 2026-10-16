import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseDateKey } from '../lib/dates';
import { goToToday, shiftSelectedDate, useStore, useUI } from '../store';
import { SECTION_NAME, type OpenStatus } from '../types';
import { DayAgenda } from './DayAgenda';
import { MonthGrid } from './MonthGrid';
import { cx, IconButton } from './ui';
import { UnscheduledTray } from './UnscheduledTray';

function FilterToggle({ section }: { section: OpenStatus }) {
  const show = useStore((s) => s.settings.calendarShow);
  return (
    <button
      type="button"
      className={cx('filter', section)}
      aria-pressed={show[section]}
      onClick={() =>
        useStore.getState().setSettings({ calendarShow: { ...show, [section]: !show[section] } })
      }
    >
      <span className={cx('status-dot', section)} aria-hidden />
      {section === 'waiting' ? 'Awaiting' : SECTION_NAME[section]}
    </button>
  );
}

export function CalendarView() {
  const selectedDate = useUI((s) => s.selectedDate);
  const month = parseDateKey(selectedDate);

  return (
    <div className="calendar">
      <div className="cal-toolbar">
        <div className="cal-nav">
          <IconButton label="Previous month ([)" onClick={() => shiftSelectedDate('month', -1)}>
            <ChevronLeft size={18} />
          </IconButton>
          <h2 className="cal-title" aria-live="polite">
            {format(month, 'MMMM yyyy')}
          </h2>
          <IconButton label="Next month (])" onClick={() => shiftSelectedDate('month', 1)}>
            <ChevronRight size={18} />
          </IconButton>
          <button type="button" className="chip" title="Today (T)" onClick={goToToday}>
            Today
          </button>
        </div>
        <div className="cal-filters" role="group" aria-label="Show in calendar">
          <FilterToggle section="todo" />
          <FilterToggle section="waiting" />
        </div>
      </div>
      <div className="cal-body">
        <MonthGrid />
        <aside className="cal-side">
          <DayAgenda />
          <UnscheduledTray />
        </aside>
      </div>
    </div>
  );
}
