import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-cook-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2 class="text-2xl font-semibold">Kitchen</h2>`,
})
export class CookHome {}
