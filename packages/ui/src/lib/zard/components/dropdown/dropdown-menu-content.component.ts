import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import type { ClassValue } from 'clsx';

import { ZardDropdownService } from './dropdown.service';
import { dropdownContentVariants } from './dropdown.variants';
import { mergeClasses } from '../../utils/merge-classes';

/**
 * On a phone the panel fills the bottom of the screen instead of hanging off a trigger:
 * full width, flat against the bottom edge, with thumb-sized rows. These come after the
 * caller's own classes so a width like `w-64` doesn't win over `w-full`.
 */
const SHEET_CLASSES =
  'w-full max-w-none rounded-b-none rounded-t-2xl border-x-0 border-b-0 p-2 ' +
  'pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl ' +
  '[&_[role=menuitem]]:min-h-12 [&_[role=menuitem]]:px-3 [&_[role=menuitem]]:text-base';

@Component({
  selector: 'z-dropdown-menu-content',
  template: `
    <ng-template #contentTemplate>
      <div [class]="contentClasses()" role="menu" tabindex="-1" aria-orientation="vertical">
        @if (dropdownService.isSheet()) {
          <div
            class="mx-auto mb-2 mt-1 h-1 w-10 shrink-0 rounded-full bg-border"
            aria-hidden="true"
          ></div>
        }
        <ng-content />
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[style.display]': '"none"',
  },
  exportAs: 'zDropdownMenuContent',
})
export class ZardDropdownMenuContentComponent {
  protected readonly dropdownService = inject(ZardDropdownService);

  readonly contentTemplate = viewChild.required<TemplateRef<unknown>>('contentTemplate');

  readonly class = input<ClassValue>('');

  protected readonly contentClasses = computed(() =>
    mergeClasses(
      dropdownContentVariants(),
      this.class(),
      this.dropdownService.isSheet() ? SHEET_CLASSES : '',
    ),
  );
}
