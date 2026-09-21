import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore, UserRole } from '@cooklog/data-access';
import { SegmentOption, UiButton, UiCard, UiField, UiInput, UiSegmented } from '@cooklog/ui';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiCard, UiField, UiInput, UiSegmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card>
      <h2 class="mb-1 text-xl font-semibold">Create your account</h2>
      <p class="mb-5 text-sm text-muted-foreground">Residents plan meals; the cook sees the docket.</p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
        <div class="space-y-1.5">
          <p class="text-sm font-medium">I am a</p>
          <ui-segmented
            label="Role"
            [options]="roles"
            [value]="role()"
            (valueChange)="role.set($any($event))"
          />
        </div>
        <ui-field label="Name" for="name" [error]="fieldError('name')">
          <input uiInput id="name" autocomplete="name" formControlName="name" />
        </ui-field>
        <ui-field label="Email" for="email" [error]="fieldError('email')">
          <input uiInput id="email" type="email" autocomplete="email" formControlName="email" />
        </ui-field>
        <ui-field label="Password" for="password" [error]="fieldError('password')">
          <input uiInput id="password" type="password" autocomplete="new-password" formControlName="password" />
        </ui-field>

        @if (error()) {
          <p class="text-sm text-destructive" role="alert">{{ error() }}</p>
        }
        @if (confirmNotice()) {
          <p class="text-sm text-success" role="status">Check your email to confirm your account, then sign in.</p>
        }
        <button uiButton size="lg" class="w-full" type="submit" [disabled]="busy()">
          {{ busy() ? 'Creating…' : 'Create account' }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-muted-foreground">
        Already registered? <a routerLink="/auth/login" class="text-primary hover:underline">Sign in</a>
      </p>
    </ui-card>
  `,
})
export class Register {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly roles: SegmentOption[] = [
    { value: 'resident', label: 'Resident' },
    { value: 'cook', label: 'Cook' },
  ];
  protected readonly role = signal<UserRole>('resident');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmNotice = signal(false);

  protected fieldError(name: 'name' | 'email' | 'password'): string | null {
    const c = this.form.controls[name];
    if (!c.touched || c.valid) return null;
    if (c.hasError('email')) return 'Enter a valid email';
    if (c.hasError('minlength')) return 'At least 8 characters';
    return 'Required';
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const result = await this.auth.signUp({ ...this.form.getRawValue(), role: this.role() });
    this.busy.set(false);
    if (result.error) this.error.set(result.error);
    else if (result.needsConfirmation) this.confirmNotice.set(true);
    else await this.router.navigateByUrl('/');
  }
}
