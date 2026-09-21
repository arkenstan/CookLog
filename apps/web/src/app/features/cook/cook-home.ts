import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { DocketStore } from '@cooklog/data-access';
import { UiCard } from '@cooklog/ui';

/** KDS view: big type, high contrast, read-only, live via Realtime. */
@Component({
  selector: 'app-cook-home',
  imports: [DecimalPipe, UiCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex items-center justify-between">
      <h2 class="text-kds-md">Today’s docket</h2>
      <span class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="size-2 animate-pulse rounded-full bg-success"></span> Live
      </span>
    </div>

    @if (store.loading() && !store.rows().length) {
      <p class="text-muted-foreground">Loading…</p>
    } @else if (!store.rows().length) {
      <p class="text-muted-foreground">Nothing to cook yet — waiting for today’s RSVPs.</p>
    }

    <section class="bento kds:grid-cols-2">
      @for (row of store.rows(); track row.meal_id) {
        <ui-card [glow]="row.status === 'pending'">
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-kds-md capitalize">{{ row.type }}</p>
            <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ row.status }}</p>
          </div>

          <p class="mt-4 text-kds-lg text-primary">{{ row.menu_item ?? 'Menu not picked yet' }}</p>

          <dl class="mt-6 grid grid-cols-3 gap-4">
            <div>
              <dd class="text-kds-lg">{{ row.people_in ?? 0 }}</dd>
              <dt class="text-sm text-muted-foreground">people</dt>
            </div>
            <div>
              <dd class="text-kds-lg">{{ row.total_rotis ?? 0 }}</dd>
              <dt class="text-sm text-muted-foreground">rotis</dt>
            </div>
            <div>
              <dd class="text-kds-lg">{{ row.total_rice_portions ?? 0 | number: '1.0-1' }}</dd>
              <dt class="text-sm text-muted-foreground">rice portions</dt>
            </div>
          </dl>

          @if (row.allergies?.length) {
            <p class="mt-5 text-sm text-warning">Allergies: {{ row.allergies.join(', ') }}</p>
          }
        </ui-card>
      }
    </section>
  `,
})
export class CookHome implements OnInit {
  protected readonly store = inject(DocketStore);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    void this.store.load();
    this.destroyRef.onDestroy(this.store.watch());
  }
}
