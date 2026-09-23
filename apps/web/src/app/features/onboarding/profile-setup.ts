import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore, UserRole } from '@cooklog/data-access';
import {
  ZardToggleGroupItem,
  ZardButtonComponent,
  ZardCardComponent,
  UiField,
  ZardInputDirective,
  ZardToggleGroupComponent,
} from '@cooklog/ui';

/** Must match the CHECK on `profiles.username` and the regex inside `complete_profile`. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

@Component({
  selector: 'app-profile-setup',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ZardButtonComponent,
    ZardCardComponent,
    UiField,
    ZardInputDirective,
    ZardToggleGroupComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md space-y-4">
      <z-card>
        <h2 class="mb-1 text-xl font-semibold">Pick a username</h2>
        <p class="mb-5 text-sm text-muted-foreground">
          This is the only thing housemates see. Cook Log stores nothing else about you.
        </p>

        <form (ngSubmit)="submit()" class="space-y-4" novalidate>
          <ui-field label="Username" for="username" [error]="fieldError()">
            <input
              z-input
              id="username"
              autocomplete="off"
              maxlength="20"
              [formControl]="username"
              [attr.aria-invalid]="fieldError() ? 'true' : null"
              [attr.aria-describedby]="fieldError() ? 'username-error' : null"
            />
          </ui-field>
          <div class="space-y-1.5">
            <p class="text-sm font-medium">I am a</p>
            <z-toggle-group
              zMode="single"
              zType="outline"
              zLabel="Role"
              [items]="roles"
              [value]="role()"
              (valueChange)="role.set($any($event))"
            />
          </div>

          @if (error()) {
            <p class="text-sm text-destructive" role="alert">{{ error() }}</p>
          }
          <button z-button zSize="lg" class="w-full" type="submit" [zDisabled]="busy()">
            {{ busy() ? 'Saving…' : 'Continue' }}
          </button>
        </form>
      </z-card>

      <button z-button zType="ghost" class="w-full" (click)="signOut()">Sign out</button>
    </div>
  `,
})
export class ProfileSetup {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly roles: ZardToggleGroupItem[] = [
    { value: 'resident', label: 'Resident' },
    { value: 'cook', label: 'Cook' },
  ];
  protected readonly role = signal<UserRole>('resident');

  protected readonly username = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(USERNAME_PATTERN)],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected fieldError(): string | null {
    if (!this.username.touched || this.username.valid) return null;
    return '3–20 letters, numbers or underscores';
  }

  /**
   * Taken-ness only comes back from the server: `profiles_select` limits reads to self and
   * housemates, so the client cannot check a username before submitting it.
   */
  protected async submit(): Promise<void> {
    if (this.username.invalid) {
      this.username.markAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const result = await this.auth.completeProfile(this.username.value, this.role());
    this.busy.set(false);
    if (result.error) this.error.set(result.error);
    else await this.router.navigateByUrl('/');
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/auth/login');
  }
}
