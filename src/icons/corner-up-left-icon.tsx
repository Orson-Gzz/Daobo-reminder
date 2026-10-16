// Animated icon from AnimateIcons (https://animateicons.in), MIT, see ./LICENSE.
// Source: github.com/Avijit07x/animateicons/blob/6f1262f7733bb9fa2cca76fe8a4498dc777d46cf/icons/lucide/corner-up-left-icon.tsx
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
export interface CornerUpLeftIconHandle {
 startAnimation: () => void;
 stopAnimation: () => void;
}

interface CornerUpLeftIconProps extends Omit<
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

const CornerUpLeftIcon = forwardRef<
 CornerUpLeftIconHandle,
 CornerUpLeftIconProps
>(
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
   (e?: React.MouseEvent<HTMLSpanElement>) => {
    if (!isControlled.current) controls.start("normal");
    else onMouseLeave?.(e as any);
   },
   [controls, onMouseLeave],
  );

  const headVariants: Variants = {
   normal: { x: 0 },
   animate: {
    x: [0, -2.5, 0.5, 0],
    transition: {
     duration: 0.5 * duration,
     ease: "easeInOut",
     times: [0, 0.4, 0.75, 1],
    },
   },
  };

  const shaftVariants: Variants = {
   normal: { scaleX: 1 },
   animate: {
    scaleX: [1, 1.156, 0.969, 1],
    transition: {
     duration: 0.5 * duration,
     ease: "easeInOut",
     times: [0, 0.4, 0.75, 1],
    },
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
      <m.path
       d="M20 20v-7a4 4 0 0 0-4-4H4"
       variants={shaftVariants}
       style={{ transformBox: "view-box", originX: "20px", originY: "12px" }}
      />
      <m.path d="M9 14 4 9l5-5" variants={headVariants} />
     </m.svg>
    </m.span>
   </LazyMotion>
  );
 },
);

CornerUpLeftIcon.displayName = "CornerUpLeftIcon";
export { CornerUpLeftIcon };
