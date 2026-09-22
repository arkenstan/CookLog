import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ActionResult, AuthStore } from '@cooklog/data-access';
import { ZardButtonComponent, ZardCardComponent, UiField, ZardInputDirective } from '@cooklog/ui';

@Component({
  selector: 'app-onboarding',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, ZardButtonComponent, ZardCardComponent, UiField, ZardInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md space-y-4">
      @if (embedded()) {
        <h2 class="text-2xl font-semibold tracking-tight">Add a household</h2>
      }
      @if (auth.role() === 'resident') {
        <z-card>
          <h2 class="mb-1 text-xl font-semibold">Start a household</h2>
          <p class="mb-4 text-sm text-muted-foreground">You’ll get an invite code for housemates and the cook.</p>
          <form (ngSubmit)="create()" class="space-y-3">
            <ui-field label="Household name" for="hh-name">
              <input z-input id="hh-name" [formControl]="name" placeholder="Flat 3B" />
            </ui-field>
            <button z-button class="w-full" type="submit" [zDisabled]="busy()">Create household</button>
          </form>
        </z-card>
      }

      <z-card>
        <h2 class="mb-1 text-xl font-semibold">Join with an invite code</h2>
        <p class="mb-4 text-sm text-muted-foreground">Ask a resident for the code shown in their app.</p>
        <form (ngSubmit)="join()" class="space-y-3">
          <ui-field label="Invite code" for="code">
            <input z-input id="code" [formControl]="code" autocomplete="off" />
          </ui-field>
          <button z-button zType="secondary" class="w-full" type="submit" [zDisabled]="busy()">Join household</button>
        </form>
      </z-card>

      @if (error()) {
        <p class="text-center text-sm text-destructive" role="alert">{{ error() }}</p>
      }
      @if (embedded()) {
        <a z-button zType="ghost" class="w-full" routerLink="/">Cancel</a>
      } @else {
        <button z-button zType="ghost" class="w-full" (click)="signOut()">Sign out</button>
      }
    </div>
  `,
})
export class Onboarding {
  protected readonly auth = inject(AuthStore);
  /** Set via route data on `/households/add`: shown inside the app shell with a Cancel link. */
  readonly embedded = input(false);
  private readonly router = inject(Router);

  protected readonly name = new FormControl('', { nonNullable: true, validators: Validators.required });
  protected readonly code = new FormControl('', { nonNullable: true, validators: Validators.required });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected create(): Promise<void> {
    return this.run(this.name, (v) => this.auth.createHousehold(v));
  }

  protected join(): Promise<void> {
    return this.run(this.code, (v) => this.auth.joinHousehold(v));
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/auth/login');
  }

  private async run(control: FormControl<string>, action: (v: string) => Promise<ActionResult>) {
    if (control.invalid) {
      control.markAsTouched();
      this.error.set('Please fill in this field');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const result = await action(control.value);
    this.busy.set(false);
    if (result.error) this.error.set(result.error);
    else await this.router.navigateByUrl('/');
  }
}
