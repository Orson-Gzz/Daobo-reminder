import type { AriaAttributes, ForwardRefExoticComponent, RefAttributes } from 'react';

/** Animated Lucide icons from AnimateIcons (MIT, see ./LICENSE), via 21st.dev. */

/** Every icon exposes this handle; passing a ref lets the parent control playback. */
export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface AnimatedIconProps extends AriaAttributes {
  size?: number;
  className?: string;
  isAnimated?: boolean;
  role?: string;
  title?: string;
}

export type AnimatedIcon = ForwardRefExoticComponent<AnimatedIconProps & RefAttributes<AnimatedIconHandle>>;

export { BellIcon } from './bell-icon';
export { CalendarDaysIcon } from './calendar-days-icon';
export { CheckIcon } from './check-icon';
export { ChevronLeftIcon } from './chevron-left-icon';
export { ChevronRightIcon } from './chevron-right-icon';
export { ChevronUpIcon } from './chevron-up-icon';
export { CircleCheckIcon } from './circle-check-icon';
export { CornerUpLeftIcon } from './corner-up-left-icon';
export { DownloadIcon } from './download-icon';
export { HourglassIcon } from './hourglass-icon';
export { KeyboardIcon } from './keyboard-icon';
export { ListChecksIcon } from './list-checks-icon';
export { MenuIcon } from './menu-icon';
export { PlusIcon } from './plus-icon';
export { RepeatIcon } from './repeat-icon';
export { RotateCcwIcon } from './rotate-ccw-icon';
export { SearchIcon } from './search-icon';
export { SearchXIcon } from './search-x-icon';
export { SettingsIcon } from './settings-icon';
export { Trash2Icon } from './trash-2-icon';
export { UploadIcon } from './upload-icon';
export { XIcon } from './x-icon';
export { ZapIcon } from './zap-icon';
