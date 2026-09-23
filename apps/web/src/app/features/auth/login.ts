import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { ZardButtonComponent, ZardCardComponent, UiField, ZardInputDirective } from '@cooklog/ui';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, ZardButtonComponent, ZardCardComponent, UiField, ZardInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <z-card>
      <h2 class="mb-1 text-xl font-semibold">Welcome to Cook Log</h2>
      <p class="mb-5 text-sm text-muted-foreground">
        Sign in with Google. We only keep the username you pick — nothing else about you.
      </p>

      <button z-button zSize="lg" class="w-full" type="button" [zDisabled]="busy()" (click)="google()">
        {{ busy() ? 'Redirecting to Google…' : 'Continue with Google' }}
      </button>

      @if (error()) {
        <p class="mt-4 text-sm text-destructive" role="alert">{{ error() }}</p>
      }

      @if (devSignIn) {
        <div class="mt-6 border-t pt-5">
          <h3 class="mb-1 text-sm font-medium">Local dev sign-in</h3>
          <p class="mb-4 text-sm text-muted-foreground">
            Seeded users only. Never rendered in a production build.
          </p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
            <ui-field label="Email" for="email" [error]="fieldError('email')">
              <input
                z-input
                id="email"
                type="email"
                autocomplete="email"
                formControlName="email"
                [attr.aria-invalid]="fieldError('email') ? 'true' : null"
                [attr.aria-describedby]="fieldError('email') ? 'email-error' : null"
              />
            </ui-field>
            <ui-field label="Password" for="password" [error]="fieldError('password')">
              <input
                z-input
                id="password"
                type="password"
                autocomplete="current-password"
                formControlName="password"
                [attr.aria-invalid]="fieldError('password') ? 'true' : null"
                [attr.aria-describedby]="fieldError('password') ? 'password-error' : null"
              />
            </ui-field>
            <button z-button zType="secondary" class="w-full" type="submit" [zDisabled]="busy()">
              Sign in
            </button>
          </form>
        </div>
      }
    </z-card>
  `,
})
export class Login {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /**
   * The seeded password users exist only on a local stack. Angular still compiles the
   * branch into the production bundle — it just never renders. The real containment is
   * server-side: the hosted project has the email provider off and no password users.
   */
  protected readonly devSignIn = !environment.production;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected fieldError(name: 'email' | 'password'): string | null {
    const c = this.form.controls[name];
    if (!c.touched || c.valid) return null;
    return c.hasError('email') ? 'Enter a valid email' : 'Required';
  }

  /** On success the tab is already leaving, so `busy` is only cleared on failure. */
  protected async google(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    const result = await this.auth.signInWithGoogle();
    if (result.error) {
      this.busy.set(false);
      this.error.set(result.error);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    const result = await this.auth.signIn(email, password);
    this.busy.set(false);
    if (result.error) this.error.set(result.error);
    else await this.router.navigateByUrl('/');
  }
}
