import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-dvh flex-col items-center justify-center gap-8 p-4">
      <h1 class="flex items-center gap-3 text-3xl font-semibold tracking-tight">
        <img src="logo.png" alt="" width="64" height="64" class="rounded-xl bg-[#09090b] p-2" />
        <span>Cook<span class="text-primary">Log</span></span>
      </h1>
      <div class="w-full max-w-md"><router-outlet /></div>
    </main>
  `,
})
export class AuthLayout {}
