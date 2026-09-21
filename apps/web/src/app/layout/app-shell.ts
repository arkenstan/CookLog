import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { UiButton } from '@cooklog/ui';
import { ThemeService } from '../core/theme';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <p class="text-lg font-semibold tracking-tight">
          Cook<span class="text-primary">Log</span>
          @if (auth.household(); as hh) {
            <span class="ml-2 text-sm font-normal text-muted-foreground">{{ hh.name }}</span>
          }
        </p>

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
