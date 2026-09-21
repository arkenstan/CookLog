import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AuthStore, Meal, MealsStore, RsvpStatus } from '@cooklog/data-access';
import { SegmentOption, UiCard, UiInput, UiSegmented } from '@cooklog/ui';

@Component({
  selector: 'app-resident-home',
  imports: [DatePipe, UiCard, UiSegmented, UiInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h2 class="text-2xl font-semibold tracking-tight">Today</h2>
      <p class="text-sm text-muted-foreground">{{ today | date: 'fullDate' }}</p>
    </div>

    @if (error()) {
      <p class="mb-4 rounded-lg border border-destructive/50 p-3 text-sm text-destructive" role="alert">
        {{ error() }}
      </p>
    }

    @if (store.loading() && !store.meals().length) {
      <p class="text-muted-foreground">Loading today’s meals…</p>
    }

    <section class="bento">
      @for (meal of store.meals(); track meal.id) {
        <ui-card [glow]="!isLocked(meal) && store.myRsvps()[meal.id] === 'in'">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm capitalize text-muted-foreground">{{ meal.type }}</p>
              <p class="mt-1 text-xl font-semibold">{{ menuName(meal) ?? 'Menu not picked yet' }}</p>
            </div>
            <span
              class="rounded-lg border px-2 py-1 text-xs"
              [class]="isLocked(meal) ? 'text-warning' : 'text-muted-foreground'"
            >
              {{ isLocked(meal) ? 'Locked' : 'Locks ' + (meal.cutoff_at | date: 'shortTime') }}
            </span>
          </div>

          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <ui-segmented
              [label]="meal.type + ' RSVP'"
              [options]="rsvpOptions"
              [value]="store.myRsvps()[meal.id] ?? null"
              [disabled]="isLocked(meal)"
              (valueChange)="rsvp(meal.id, $event)"
            />
            <p class="text-sm text-muted-foreground">
              <span class="text-lg font-semibold text-foreground">{{ store.inCounts()[meal.id] ?? 0 }}</span> in
            </p>
          </div>

          <div class="mt-5 border-t pt-4 text-sm">
            @if (meal.picker_id === auth.userId()) {
              <label class="mb-1.5 block font-medium" [attr.for]="'menu-' + meal.id">
                You’re picking today’s menu
              </label>
              <select
                uiInput
                [id]="'menu-' + meal.id"
                [disabled]="isLocked(meal)"
                (change)="pickMenu(meal.id, $any($event.target).value)"
              >
                <option value="" [selected]="!meal.menu_item_id">Choose a dish…</option>
                @for (item of store.menuItems(); track item.id) {
                  <option [value]="item.id" [selected]="item.id === meal.menu_item_id">{{ item.name }}</option>
                }
              </select>
            } @else {
              <p class="text-muted-foreground">
                Menu picked by
                <span class="text-foreground">{{ meal.picker_id ? (store.names()[meal.picker_id] ?? 'a housemate') : 'nobody yet' }}</span>
              </p>
            }
          </div>
        </ui-card>
      }
    </section>
  `,
})
export class ResidentHome implements OnInit {
  protected readonly store = inject(MealsStore);
  protected readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly today = new Date();
  protected readonly error = signal<string | null>(null);
  protected readonly rsvpOptions: SegmentOption[] = [
    { value: 'in', label: 'In' },
    { value: 'out', label: 'Out' },
  ];

  /** Ticks so a meal locks on screen the moment its cutoff passes. */
  private readonly now = signal(Date.now());
  private readonly menuById = computed(
    () => new Map(this.store.menuItems().map((m) => [m.id, m.name])),
  );

  ngOnInit(): void {
    void this.store.load();
    this.destroyRef.onDestroy(this.store.watch());
    const tick = setInterval(() => this.now.set(Date.now()), 15_000);
    this.destroyRef.onDestroy(() => clearInterval(tick));
  }

  protected isLocked(meal: Meal): boolean {
    return meal.status !== 'pending' || this.now() >= new Date(meal.cutoff_at).getTime();
  }

  protected menuName(meal: Meal): string | null {
    return meal.menu_item_id ? (this.menuById().get(meal.menu_item_id) ?? null) : null;
  }

  protected async rsvp(mealId: string, value: string | null): Promise<void> {
    if (value !== 'in' && value !== 'out') return;
    this.error.set(null);
    const result = await this.store.setRsvp(mealId, value as RsvpStatus);
    if (result.error) this.error.set(`Couldn’t update your RSVP: ${result.error}`);
  }

  protected async pickMenu(mealId: string, itemId: string): Promise<void> {
    this.error.set(null);
    const result = await this.store.setMenu(mealId, itemId || null);
    if (result.error) this.error.set(result.error);
  }
}
