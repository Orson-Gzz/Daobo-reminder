// Animated icon from AnimateIcons (https://animateicons.in), MIT, see ./LICENSE.
// Source: github.com/Avijit07x/animateicons/blob/6f1262f7733bb9fa2cca76fe8a4498dc777d46cf/icons/lucide/hourglass-icon.tsx
import { cx } from '../components/ui';
import type { Variants } from "motion/react";
import {
 LazyMotion,
 domMin,
 m,
 useAnimation,
 useReducedMotion,
} from "motion/react";
import {
 forwardRef,
 useCallback,
 useImperativeHandle,
 useRef,
 type HTMLAttributes,
} from "react";
export interface HourglassIconHandle {
 startAnimation: () => void;
 stopAnimation: () => void;
}

interface HourglassIconProps extends Omit<
 HTMLAttributes<HTMLSpanElement>,
 | "color"
 | "onDrag"
 | "onDragStart"
 | "onDragEnd"
 | "onAnimationStart"
 | "onAnimationEnd"
 | "onAnimationIteration"
> {
 size?: number;
 duration?: number;
 isAnimated?: boolean;
 color?: string;
}

const HourglassIcon = forwardRef<HourglassIconHandle, HourglassIconProps>(
 (
  {
   onMouseEnter,
   onMouseLeave,
   className,
   size = 24,
   duration = 1,
   isAnimated = true,
   color,
   ...props
  },
  ref,
 ) => {
  const controls = useAnimation();
  const reduced = useReducedMotion();
  const isControlled = useRef(false);

  useImperativeHandle(ref, () => {
   isControlled.current = true;
   return {
    startAnimation: () =>
     reduced ? controls.start("normal") : controls.start("animate"),
    stopAnimation: () => controls.start("normal"),
   };
  });

  const handleEnter = useCallback(
   (e?: React.MouseEvent<HTMLSpanElement>) => {
    if (!isAnimated || reduced) return;
    if (!isControlled.current) controls.start("animate");
    else onMouseEnter?.(e as any);
   },
   [controls, reduced, isAnimated, onMouseEnter],
  );

  const handleLeave = useCallback(
   (e: React.MouseEvent<HTMLSpanElement>) => {
    if (!isControlled.current) {
     controls.start("normal");
    } else {
     onMouseLeave?.(e as any);
    }
   },
   [controls, onMouseLeave],
  );

  const flipVariants: Variants = {
   normal: { rotate: 0 },
   animate: {
    rotate: [0, 180],
    transition: { duration: 0.9 * duration, ease: "easeInOut" },
   },
  };

  return (
   <LazyMotion features={domMin} strict>
    <m.span
     className={cx('anim-icon', className)}
     onMouseEnter={handleEnter}
     onMouseLeave={handleLeave}
     {...props}
     style={{ color, ...props.style }}
    >
     <m.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={controls}
      initial="normal"
     >
      <m.g
       variants={flipVariants}
       style={{ transformBox: "view-box", originX: "12px", originY: "12px" }}
      >
       <path d="M5 22h14" />
       <path d="M5 2h14" />
       <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
       <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
      </m.g>
     </m.svg>
    </m.span>
   </LazyMotion>
  );
 },
);

HourglassIcon.displayName = "HourglassIcon";
export { HourglassIcon };
