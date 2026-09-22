import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { ZardButtonComponent, ZardDropdownImports, ZardIconComponent } from '@cooklog/ui';

/** Header dropdown: current household, the others you belong to, and join/create actions. */
@Component({
  selector: 'app-household-switcher',
  imports: [ZardButtonComponent, ZardDropdownImports, ZardIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `min-w-0` so a long household name truncates instead of pushing the header menu off screen.
  host: { class: 'flex min-w-0' },
  template: `
    <button
      type="button"
      z-button
      zType="outline"
      zSize="sm"
      class="min-w-0 max-w-full"
      z-dropdown
      [zDropdownMenu]="householdMenu"
    >
      <span class="truncate">{{ auth.household()?.name ?? 'Choose household' }}</span>
      <z-icon zType="chevron-down" class="size-4 shrink-0 text-muted-foreground" />
    </button>

    <z-dropdown-menu-content #householdMenu="zDropdownMenuContent" class="w-56">
      @for (h of auth.households(); track h.id) {
        <z-dropdown-menu-item
          (click)="switchTo(h.id)"
          [attr.aria-current]="h.id === auth.activeHouseholdId()"
        >
          <span class="flex-1 truncate">{{ h.name }}</span>
          @if (h.id === auth.activeHouseholdId()) {
            <z-icon zType="check" class="size-4 text-primary" aria-label="Current" />
          }
        </z-dropdown-menu-item>
      }

      <div class="my-1 border-t"></div>
      <z-dropdown-menu-item (click)="addHousehold()">
        <z-icon zType="plus" class="size-4" />
        Join or create household
      </z-dropdown-menu-item>
    </z-dropdown-menu-content>
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

  protected addHousehold(): Promise<boolean> {
    return this.router.navigateByUrl('/households/add');
  }
}
