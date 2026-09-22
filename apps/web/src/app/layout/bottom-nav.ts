import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

const ITEM =
  'flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium ' +
  'text-muted-foreground transition-colors duration-fast focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

/**
 * Thumb-reachable navigation for residents on phones. The header nav is `hidden sm:flex`,
 * so without this there is no way to reach anything but the events list on a small screen.
 *
 * Icons are Lucide-style strokes in `currentColor` so they take the lime active colour with
 * the label — the app has no icon font, and coloured emoji would fight the theme.
 */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
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
            <svg
              aria-hidden="true"
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2" />
              <path d="M6 2v20" />
              <path d="M18 2v20" />
              <path d="M18 14c2 0 3-1.5 3-4V2c-2.5 0-3 3-3 6z" />
            </svg>
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
            <svg
              aria-hidden="true"
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
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
            <svg
              aria-hidden="true"
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z" />
            </svg>
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
