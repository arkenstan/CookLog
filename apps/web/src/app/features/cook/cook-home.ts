import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { AuthStore, DocketItem, DocketStore, formatAmount } from '@cooklog/data-access';
import { UiCard } from '@cooklog/ui';

/** KDS view: today's and upcoming events with what to cook, big type, read-only, live. */
@Component({
  selector: 'app-cook-home',
  imports: [DatePipe, UiCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex items-center justify-between">
      <h2 class="text-kds-md">What to cook</h2>
      <span class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="size-2 animate-pulse rounded-full bg-success"></span> Live
      </span>
    </div>

    @if (store.loading() && !store.events().length) {
      <p class="text-muted-foreground">Loading…</p>
    } @else if (!store.events().length) {
      <ui-card>
        <p class="font-medium">No meal events today or coming up.</p>
        <p class="mt-1 text-sm text-muted-foreground">They’ll appear here as soon as a resident creates one.</p>
      </ui-card>
    }

    <section class="bento kds:grid-cols-2">
      @for (e of store.events(); track e.meal_id) {
        <ui-card [glow]="e.status === 'pending'">
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-kds-md">{{ e.title }}</p>
            <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ e.status }}</p>
          </div>
          <p class="mt-1 text-sm text-muted-foreground">{{ e.starts_at | date: 'EEE d MMM · h:mm a' }}</p>

          <p class="mt-5 text-kds-lg text-primary">
            {{ e.people_in ?? 0 }} <span class="text-lg font-normal text-muted-foreground">{{ e.people_in === 1 ? 'person' : 'people' }}</span>
          </p>

          <ul class="mt-4 space-y-2">
            @for (item of itemsFor(e.meal_id); track item.item_id) {
              <li class="flex items-baseline justify-between gap-4 border-t pt-2">
                <span class="text-xl">{{ item.name }}</span>
                <span class="text-kds-md">{{ amount(item) }}</span>
              </li>
            } @empty {
              <li class="text-sm text-muted-foreground">No items yet.</li>
            }
          </ul>

          @if (e.allergies?.length) {
            <p class="mt-5 text-sm text-warning">Allergies: {{ e.allergies.join(', ') }}</p>
          }
        </ui-card>
      }
    </section>
  `,
})
export class CookHome implements OnInit {
  protected readonly store = inject(DocketStore);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // (Re)load whenever the active household changes.
    effect(() => {
      this.auth.activeHouseholdId();
      untracked(() => void this.store.load());
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(this.store.watch());
  }

  protected itemsFor(mealId: string | null): DocketItem[] {
    return this.store
      .items()
      .filter((i) => i.meal_id === mealId)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  protected amount(item: DocketItem): string {
    return item.kind ? formatAmount(item.kind, Number(item.total ?? 0)) : String(item.total ?? 0);
  }
}
