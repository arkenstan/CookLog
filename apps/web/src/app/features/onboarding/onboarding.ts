import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ActionResult, AuthStore } from '@cooklog/data-access';
import { UiButton, UiCard, UiField, UiInput } from '@cooklog/ui';

@Component({
  selector: 'app-onboarding',
  imports: [ReactiveFormsModule, UiButton, UiCard, UiField, UiInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      @if (auth.role() === 'resident') {
        <ui-card>
          <h2 class="mb-1 text-xl font-semibold">Start a household</h2>
          <p class="mb-4 text-sm text-muted-foreground">You’ll get an invite code for housemates and the cook.</p>
          <form (ngSubmit)="create()" class="space-y-3">
            <ui-field label="Household name" for="hh-name">
              <input uiInput id="hh-name" [formControl]="name" placeholder="Flat 3B" />
            </ui-field>
            <button uiButton class="w-full" type="submit" [disabled]="busy()">Create household</button>
          </form>
        </ui-card>
      }

      <ui-card>
        <h2 class="mb-1 text-xl font-semibold">Join with an invite code</h2>
        <p class="mb-4 text-sm text-muted-foreground">Ask a resident for the code shown in their app.</p>
        <form (ngSubmit)="join()" class="space-y-3">
          <ui-field label="Invite code" for="code">
            <input uiInput id="code" [formControl]="code" autocomplete="off" />
          </ui-field>
          <button uiButton variant="secondary" class="w-full" type="submit" [disabled]="busy()">Join household</button>
        </form>
      </ui-card>

      @if (error()) {
        <p class="text-center text-sm text-destructive" role="alert">{{ error() }}</p>
      }
      <button uiButton variant="ghost" class="w-full" (click)="signOut()">Sign out</button>
    </div>
  `,
})
export class Onboarding {
  protected readonly auth = inject(AuthStore);
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
