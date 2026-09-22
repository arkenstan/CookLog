import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ZardIconComponent } from '@cooklog/ui';

const ITEM =
  'flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium ' +
  'text-muted-foreground transition-colors duration-fast focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

/**
 * Thumb-reachable navigation for residents on phones. The header nav is `hidden sm:flex`,
 * so without this there is no way to reach anything but the events list on a small screen.
 *
 * Icons come from ZardUI's Lucide set and inherit `currentColor`, so they take the lime
 * active colour along with the label.
 */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, ZardIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      aria-label="Primary"
      class="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul class="mx-auto flex max-w-6xl items-stretch">
        <li class="flex-1">
          <a
            routerLink="/home"
            routerLinkActive="text-primary"
            #events="routerLinkActive"
            [routerLinkActiveOptions]="{ exact: true }"
            [attr.aria-current]="events.isActive ? 'page' : null"
            [class]="item"
          >
            <z-icon zType="utensils" class="size-5" />
            Events
          </a>
        </li>
        <li class="flex-1">
          <a
            routerLink="/grocery"
            routerLinkActive="text-primary"
            #grocery="routerLinkActive"
            [attr.aria-current]="grocery.isActive ? 'page' : null"
            [class]="item"
          >
            <z-icon zType="shopping-cart" class="size-5" />
            Grocery
          </a>
        </li>
        <li class="flex-1">
          <a
            routerLink="/regulars"
            routerLinkActive="text-primary"
            #regulars="routerLinkActive"
            [attr.aria-current]="regulars.isActive ? 'page' : null"
            [class]="item"
          >
            <z-icon zType="star" class="size-5" />
            Regulars
          </a>
        </li>
      </ul>
    </nav>
  `,
})
export class BottomNav {
  protected readonly item = ITEM;
}
