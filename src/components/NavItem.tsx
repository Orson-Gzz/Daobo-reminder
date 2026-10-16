import type { ComponentProps, ReactNode } from 'react';
import type { AnimatedIcon } from '../icons';
import { cx, useIconAnimation } from './ui';

interface NavItemProps extends ComponentProps<'button'> {
  icon: AnimatedIcon;
  label: string;
  active?: boolean;
  /** Marker on the icon corner (e.g. overdue). */
  badge?: ReactNode;
  /** Trailing content, such as a count. Fades in with the label. */
  end?: ReactNode;
}

/**
 * A sidebar row: the icon keeps its column in the collapsed rail; the label fades in as
 * the sidebar opens and nudges right on hover (after Aceternity's SidebarLink).
 */
export function NavItem({ icon: Icon, label, active, badge, end, className, ...rest }: NavItemProps) {
  const { ref, triggers } = useIconAnimation();
  return (
    <button type="button" className={cx('nav-item', active && 'active', className)} {...triggers} {...rest}>
      <span className="nav-icon">
        <Icon ref={ref} size={18} aria-hidden />
        {badge}
      </span>
      <span className="nav-label">{label}</span>
      {end}
    </button>
  );
}
