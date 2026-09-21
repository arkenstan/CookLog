import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-resident-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2 class="text-2xl font-semibold">Today</h2>`,
})
export class ResidentHome {}
