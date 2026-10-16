import { useMemo, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { AnimatedIcon, AnimatedIconHandle } from '../icons';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** Play an animated icon while its whole control is hovered or focused, not just the glyph. */
export function useIconAnimation() {
  const ref = useRef<AnimatedIconHandle>(null);
  const triggers = useMemo(() => {
    const start = () => ref.current?.startAnimation();
    const stop = () => ref.current?.stopAnimation();
    return { onMouseEnter: start, onMouseLeave: stop, onFocus: start, onBlur: stop };
  }, []);
  return { ref, triggers };
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: AnimatedIcon;
  size?: number;
}

export function IconButton({ label, icon: Icon, size = 16, className, ...rest }: IconButtonProps) {
  const { ref, triggers } = useIconAnimation();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('icon-btn', className)}
      {...triggers}
      {...rest}
    >
      <Icon ref={ref} size={size} aria-hidden />
    </button>
  );
}

interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: AnimatedIcon;
  size?: number;
  children: ReactNode;
}

export function TextButton({ icon: Icon, size = 14, className, children, ...rest }: TextButtonProps) {
  const { ref, triggers } = useIconAnimation();
  return (
    <button type="button" className={cx('text-btn', className)} {...triggers} {...rest}>
      <Icon ref={ref} size={size} aria-hidden />
      {children}
    </button>
  );
}

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string | number>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
