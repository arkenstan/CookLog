/**
 * Icon registry.
 *
 * ZardUI ships this backed by `lucide-angular`, whose peer range stops at Angular 21.
 * We're on 22, so this is re-pointed at `@ng-icons/lucide` (peer `>=22`) — the package
 * ZardUI's own install docs list. Same Lucide glyphs, supported Angular version.
 *
 * Keys stay kebab-case so vendored ZardUI templates (`zType="loader-circle"`) keep working.
 */
import {
  lucideCheck,
  lucideChevronDown,
  lucideEllipsisVertical,
  lucideLoaderCircle,
  lucidePlus,
  lucideShoppingCart,
  lucideStar,
  lucideUtensils,
  lucideX,
} from '@ng-icons/lucide';

export const ZARD_ICONS = {
  'loader-circle': lucideLoaderCircle,
  check: lucideCheck,
  x: lucideX,
  plus: lucidePlus,
  'chevron-down': lucideChevronDown,
  'ellipsis-vertical': lucideEllipsisVertical,
  utensils: lucideUtensils,
  'shopping-cart': lucideShoppingCart,
  star: lucideStar,
} as const satisfies Record<string, string>;

export type ZardIconName = keyof typeof ZARD_ICONS;
/** A registry key, or a raw SVG string for a one-off glyph. */
export type ZardIcon = ZardIconName | string;
