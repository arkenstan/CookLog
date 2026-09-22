import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { ZardButtonComponent, ZardCardComponent, UiField, ZardInputDirective } from '@cooklog/ui';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, ZardButtonComponent, ZardCardComponent, UiField, ZardInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <z-card>
      <h2 class="mb-1 text-xl font-semibold">Welcome back</h2>
      <p class="mb-5 text-sm text-muted-foreground">Sign in to your household.</p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
        <ui-field label="Email" for="email" [error]="fieldError('email')">
          <input z-input id="email" type="email" autocomplete="email" formControlName="email" />
        </ui-field>
        <ui-field label="Password" for="password" [error]="fieldError('password')">
          <input z-input id="password" type="password" autocomplete="current-password" formControlName="password" />
        </ui-field>

        @if (error()) {
          <p class="text-sm text-destructive" role="alert">{{ error() }}</p>
        }
        <button z-button zSize="lg" class="w-full" type="submit" [zDisabled]="busy()">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-muted-foreground">
        New here? <a routerLink="/auth/register" class="text-primary hover:underline">Create an account</a>
      </p>
    </z-card>
  `,
})
export class Login {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

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
