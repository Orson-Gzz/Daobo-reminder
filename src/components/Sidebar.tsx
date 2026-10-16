import { useDroppable } from '@dnd-kit/core';
import { domAnimation, LazyMotion, m, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { BellIcon, CalendarDaysIcon, CircleCheckIcon, HourglassIcon, ListChecksIcon, XIcon, type AnimatedIcon } from '../icons';
import { isDueToday, isOverdue } from '../lib/dates';
import { matchesQuery } from '../lib/sort';
import { setTab, setView, useStore, useUI } from '../store';
import { SECTION_NAME, SECTIONS, type Status } from '../types';
import { Menu } from './Menu';
import { NavItem } from './NavItem';
import { cx, IconButton } from './ui';

export const TAB_DROP_PREFIX = 'tab:';

const RAIL_WIDTH = 60;
const OPEN_WIDTH = 236;
const PHONE = '(max-width: 720px)';

export const SECTION_ICON: Record<Status, AnimatedIcon> = {
  todo: ListChecksIcon,
  waiting: HourglassIcon,
  done: CircleCheckIcon,
};

const closeNav = () => useUI.setState({ navOpen: false });

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

interface SectionProps {
  section: Status;
  count: number;
  overdue: number;
}

/** A tab of the list view and a drop target that moves items to its section. */
function SectionItem({ section, count, overdue }: SectionProps) {
  const inList = useStore((s) => s.settings.view === 'list');
  const current = useUI((s) => s.tab === section);
  const selected = inList && current;
  const { setNodeRef, isOver, active: dragging } = useDroppable({ id: TAB_DROP_PREFIX + section });

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = ({ ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    const next = SECTIONS[(SECTIONS.indexOf(section) + step + SECTIONS.length) % SECTIONS.length];
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <NavItem
      ref={setNodeRef}
      id={`tab-${section}`}
      role="tab"
      aria-selected={selected}
      aria-controls={inList ? 'panel' : undefined}
      tabIndex={current ? 0 : -1}
      icon={SECTION_ICON[section]}
      label={SECTION_NAME[section]}
      active={selected}
      className={cx(section, isOver && 'drop-over', dragging && !selected && 'drop-target')}
      badge={overdue > 0 && <span className="overdue-dot" title={`${overdue} overdue`} aria-label={`${overdue} overdue`} />}
      end={<span className="nav-count">{count}</span>}
      onClick={() => {
        setTab(section);
        closeNav();
      }}
      onKeyDown={onKeyDown}
    />
  );
}

/**
 * Reminders (To-do, Awaiting Reply, Completed), Calendar and Settings.
 * Desktop: an icon rail that widens on hover or keyboard focus. Phones: a sheet that
 * slides in from the left. The motion follows Aceternity's sidebar (21st.dev).
 */
export function Sidebar() {
  const reminders = useStore((s) => s.reminders);
  const view = useStore((s) => s.settings.view);
  const query = useUI((s) => s.query);
  const now = useUI((s) => s.now);
  const navOpen = useUI((s) => s.navOpen);
  const menuOpen = useUI((s) => s.menuOpen);
  const phone = useMediaQuery(PHONE);
  const reduced = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = phone || hovered || focused || menuOpen;

  // mouseleave never fires when the element under the pointer is removed (e.g. the
  // settings menu closing), so double-check on the next pointer move.
  useEffect(() => {
    if (!hovered) return;
    const onMove = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setHovered(false);
    };
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, [hovered]);

  // Leaving the phone layout closes the sheet; opening it moves focus inside.
  useEffect(() => {
    if (!phone) closeNav();
  }, [phone]);
  useEffect(() => {
    if (phone && navOpen) document.querySelector<HTMLElement>('.nav-close')?.focus();
  }, [phone, navOpen]);

  const counts = { todo: 0, waiting: 0, done: 0 };
  const overdue = { todo: 0, waiting: 0, done: 0 };
  let dueToday = 0;
  for (const r of reminders) {
    if (!matchesQuery(r, query)) continue;
    counts[r.status]++;
    if (r.status === 'done') continue;
    if (isOverdue(r, now)) overdue[r.status]++;
    if (isDueToday(r, now)) dueToday++;
  }

  // Open for keyboard focus only, so a mouse click doesn't pin the rail open.
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    if (e.target.matches(':focus-visible')) setFocused(true);
  };
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    <LazyMotion features={domAnimation}>
      <m.nav
        ref={navRef}
        key={phone ? 'sheet' : 'rail'}
        className={cx('nav', open && 'open', phone && 'sheet')}
        aria-label="Navigation"
        initial={false}
        animate={phone ? { x: navOpen ? '0%' : '-100%', opacity: navOpen ? 1 : 0 } : { width: open ? OPEN_WIDTH : RAIL_WIDTH }}
        transition={reduced ? { duration: 0 } : { duration: 0.3, ease: 'easeInOut' }}
        inert={phone && !navOpen}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {phone && <IconButton label="Close navigation" icon={XIcon} size={20} className="nav-close" onClick={closeNav} />}
        <div className="nav-main">
          <NavItem
            icon={BellIcon}
            label="Reminders"
            className={cx('nav-group', view === 'list' && 'current')}
            aria-current={view === 'list' ? 'page' : undefined}
            onClick={() => {
              setView('list');
              closeNav();
            }}
          />
          <div className="nav-sub" role="tablist" aria-label="Sections" aria-orientation="vertical">
            {SECTIONS.map((s) => (
              <SectionItem key={s} section={s} count={counts[s]} overdue={overdue[s]} />
            ))}
          </div>
          <NavItem
            icon={CalendarDaysIcon}
            label="Calendar"
            aria-label="Calendar"
            aria-pressed={view === 'calendar'}
            title="Calendar (C)"
            className="calendar"
            active={view === 'calendar'}
            end={
              <span className="nav-count" aria-hidden title={`${dueToday} due today`}>
                {dueToday}
              </span>
            }
            onClick={() => {
              setView('calendar');
              closeNav();
            }}
          />
        </div>
        <div className="nav-foot">
          <Menu />
        </div>
      </m.nav>
    </LazyMotion>
  );
}
