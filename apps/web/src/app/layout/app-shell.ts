import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { UiButton } from '@cooklog/ui';
import { HouseholdSwitcher } from './household-switcher';
import { ThemeService } from '../core/theme';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiButton, HouseholdSwitcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div class="flex items-center gap-3">
          <p class="text-lg font-semibold tracking-tight">Cook<span class="text-primary">Log</span></p>
          <app-household-switcher />
          @if (auth.role() === 'resident') {
            <nav class="ml-2 hidden items-center gap-1 text-sm sm:flex" aria-label="Main">
              <a routerLink="/home" routerLinkActive="text-foreground" [routerLinkActiveOptions]="{ exact: true }" class="rounded-lg px-3 py-2 text-muted-foreground transition-colors duration-fast hover:bg-muted">Events</a>
              <a routerLink="/regulars" routerLinkActive="text-foreground" class="rounded-lg px-3 py-2 text-muted-foreground transition-colors duration-fast hover:bg-muted">Regulars</a>
            </nav>
          }
        </div>

        <div class="flex items-center gap-2">
          @if (auth.role() === 'resident' && auth.household(); as hh) {
            <button uiButton variant="ghost" (click)="copyCode(hh.invite_code)" title="Copy invite code">
              {{ copied() ? 'Copied' : 'Invite: ' + hh.invite_code }}
            </button>
          }
          <button uiButton variant="ghost" (click)="theme.toggle()" aria-label="Toggle theme">
            {{ theme.mode() === 'dark' ? 'Light' : 'Dark' }}
          </button>
          <button uiButton variant="secondary" (click)="signOut()">Sign out</button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl p-4 md:p-8"><router-outlet /></main>
  `,
})
export class AppShell {
  protected readonly auth = inject(AuthStore);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  protected readonly copied = signal(false);

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/auth/login');
  }

  protected async copyCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {}
  }
}
