import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { UiDropdown, UiMenuItem } from '@cooklog/ui';
import { BottomNav } from './bottom-nav';
import { HouseholdSwitcher } from './household-switcher';
import { ThemeService } from '../core/theme';

const NAV_LINK =
  'rounded-lg px-3 py-2 text-muted-foreground transition-colors duration-fast hover:bg-muted ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    UiDropdown,
    UiMenuItem,
    BottomNav,
    HouseholdSwitcher,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >Skip to content</a
    >

    <header class="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div class="flex items-center gap-3">
          <h1 class="text-lg font-semibold tracking-tight">Cook<span class="text-primary">Log</span></h1>
          <app-household-switcher />
          @if (auth.role() === 'resident') {
            <nav class="ml-2 hidden items-center gap-1 text-sm sm:flex" aria-label="Main">
              <a
                routerLink="/home"
                routerLinkActive="text-foreground"
                #events="routerLinkActive"
                [routerLinkActiveOptions]="{ exact: true }"
                [attr.aria-current]="events.isActive ? 'page' : null"
                [class]="navLink"
                >Events</a
              >
              <a
                routerLink="/grocery"
                routerLinkActive="text-foreground"
                #grocery="routerLinkActive"
                [attr.aria-current]="grocery.isActive ? 'page' : null"
                [class]="navLink"
                >Grocery</a
              >
              <a
                routerLink="/regulars"
                routerLinkActive="text-foreground"
                #regulars="routerLinkActive"
                [attr.aria-current]="regulars.isActive ? 'page' : null"
                [class]="navLink"
                >Regulars</a
              >
            </nav>
          }
        </div>

        <ui-dropdown align="end" label="Account and settings" [chevron]="false">
          <span trigger aria-hidden="true" class="text-lg leading-none">⋮</span>

          @if (auth.role() === 'resident' && auth.household(); as hh) {
            <button uiMenuItem type="button" (click)="copyCode(hh.invite_code)">
              <span class="flex-1 whitespace-nowrap">Copy invite code</span>
              <span class="font-mono text-xs text-muted-foreground">{{ hh.invite_code }}</span>
            </button>
          }
          <button uiMenuItem type="button" (click)="theme.toggle()">{{ themeLabel() }}</button>

          <div class="my-1 border-t"></div>
          <button uiMenuItem type="button" class="text-destructive" (click)="signOut()">
            Sign out
          </button>
        </ui-dropdown>
      </div>

      <p class="sr-only" role="status" aria-live="polite">{{ status() }}</p>
    </header>

    <main id="main-content" tabindex="-1" [class]="mainClass()"><router-outlet /></main>

    @if (showBottomNav()) {
      <app-bottom-nav />
    }
  `,
})
export class AppShell {
  protected readonly auth = inject(AuthStore);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly navLink = NAV_LINK;
  /** Announced politely after a clipboard attempt; cleared so it doesn't linger. */
  protected readonly status = signal('');

  protected readonly themeLabel = computed(() =>
    this.theme.mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
  );
  protected readonly showBottomNav = computed(() => this.auth.role() === 'resident');
  protected readonly mainClass = computed(
    () =>
      'mx-auto max-w-6xl p-4 focus:outline-none md:p-8' +
      // Clear the fixed bottom bar on phones.
      (this.showBottomNav() ? ' pb-28 sm:pb-4 md:pb-8' : ''),
  );

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/auth/login');
  }

  protected async copyCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.status.set(`Invite code ${code} copied to the clipboard`);
    } catch {
      // Clipboard access fails on non-secure origins; read the code out instead.
      this.status.set(`Couldn't copy automatically. Your invite code is ${code}`);
    }
    setTimeout(() => this.status.set(''), 4000);
  }
}
