import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { UiDropdown, UiMenuItem } from '@cooklog/ui';

/** Header dropdown: current household, the others you belong to, and join/create actions. */
@Component({
  selector: 'app-household-switcher',
  imports: [RouterLink, UiDropdown, UiMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dropdown>
      <span trigger class="max-w-40 truncate">{{ auth.household()?.name ?? 'Choose household' }}</span>

      @for (h of auth.households(); track h.id) {
        <button uiMenuItem type="button" (click)="switchTo(h.id)" [attr.aria-current]="h.id === auth.activeHouseholdId()">
          <span class="flex-1 truncate">{{ h.name }}</span>
          @if (h.id === auth.activeHouseholdId()) {
            <span class="text-primary" aria-label="Current">✓</span>
          }
        </button>
      }

      <div class="my-1 border-t"></div>
      <a uiMenuItem routerLink="/households/add">＋ Join or create household</a>
    </ui-dropdown>
  `,
})
export class HouseholdSwitcher {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected async switchTo(id: string): Promise<void> {
    const { error } = await this.auth.switchHousehold(id);
    // Pages reload their data when the active household changes; leave any household-specific page.
    if (!error) await this.router.navigateByUrl('/');
  }
}
