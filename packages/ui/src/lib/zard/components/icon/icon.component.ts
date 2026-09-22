import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '../../utils/merge-classes';

import { iconVariants, type ZardIconSizeVariants } from './icon.variants';
import { ZARD_ICONS, type ZardIcon } from './icons';

/**
 * Backed by `@ng-icons/core` rather than ZardUI's `lucide-angular`, which does not
 * support Angular 22. Public API (`zType`, `zSize`, `class`) is unchanged, so the
 * vendored Button and Toggle Group templates work untouched.
 */
@Component({
  selector: 'z-icon, [z-icon]',
  imports: [NgIcon],
  viewProviders: [provideIcons(ZARD_ICONS)],
  template: `<ng-icon [svg]="svg()" [class]="classes()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ZardIconComponent {
  readonly zType = input.required<ZardIcon>();
  readonly zSize = input<ZardIconSizeVariants>('default');
  readonly zStrokeWidth = input<number>(2);
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(iconVariants({ zSize: this.zSize() }), this.class()),
  );

  /** A registry key resolves to its glyph; anything else is treated as raw SVG. */
  protected readonly svg = computed(() => {
    const type = this.zType();
    return (ZARD_ICONS as Record<string, string>)[type] ?? type;
  });
}
