import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AuthStore,
  CatalogStore,
  EventPhase,
  EventsStore,
  Meal,
  RsvpStatus,
  formatAmount,
  isRsvpOpen,
} from '@cooklog/data-access';
import { SegmentOption, UiButton, UiCard, UiSegmented } from '@cooklog/ui';
import { injectNow } from '../../core/now';

@Component({
  selector: 'app-resident-home',
  imports: [DatePipe, RouterLink, UiButton, UiCard, UiSegmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">Meal events</h2>
        <p class="text-sm text-muted-foreground">Plan what’s cooking and tell the house if you’re in.</p>
      </div>
      <a uiButton routerLink="/events/new">＋ New meal event</a>
    </div>

    <ui-segmented class="mb-6" label="Event phase" [options]="tabs()" [value]="tab()" (valueChange)="tab.set($any($event))" />

    @if (error()) {
      <p class="mb-4 rounded-lg border border-destructive/50 p-3 text-sm text-destructive" role="alert">{{ error() }}</p>
    }

    @if (events.loading() && !events.events().length) {
      <p class="text-muted-foreground">Loading events…</p>
    } @else if (!visible().length) {
      <ui-card>
        <p class="font-medium">Nothing {{ tab() }} right now.</p>
        <p class="mt-1 text-sm text-muted-foreground">
          @if (tab() === 'completed') { Finished events will show up here. } @else { Create a meal event to get started. }
        </p>
      </ui-card>
    }

    <section class="bento">
      @for (e of visible(); track e.id) {
        <ui-card [glow]="isOpen(e) && events.myRsvps()[e.id] === 'in'">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ e.type }}</p>
              <a [routerLink]="['/events', e.id]" class="mt-1 block truncate text-xl font-semibold hover:underline">{{ e.title }}</a>
              <p class="mt-1 text-sm text-muted-foreground">{{ e.starts_at | date: 'EEE d MMM · h:mm a' }}</p>
            </div>
            <span class="shrink-0 rounded-lg border px-2 py-1 text-xs" [class]="isOpen(e) ? 'text-muted-foreground' : 'text-warning'">
              {{ isOpen(e) ? 'RSVP until ' + (e.cutoff_at | date: 'h:mm a') : 'RSVPs closed' }}
            </span>
          </div>

          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <ui-segmented
              [label]="e.title + ' availability'"
              [options]="rsvpOptions"
              [value]="events.myRsvps()[e.id] ?? null"
              [disabled]="!isOpen(e)"
              (valueChange)="rsvp(e.id, $event)"
            />
            <p class="text-sm text-muted-foreground">
              <span class="text-lg font-semibold text-foreground">{{ events.inCounts()[e.id] ?? 0 }}</span> in
            </p>
          </div>

          @if (summary(e).length) {
            <p class="mt-4 border-t pt-3 text-sm text-muted-foreground">
              Your items: <span class="text-foreground">{{ summary(e).join(' · ') }}</span>
            </p>
          }
          <a [routerLink]="['/events', e.id]" class="mt-3 inline-block text-sm text-primary hover:underline">Details & items →</a>
        </ui-card>
      }
    </section>
  `,
})
export class ResidentHome implements OnInit {
  protected readonly events = inject(EventsStore);
  private readonly catalog = inject(CatalogStore);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly now = injectNow();
  protected readonly tab = signal<EventPhase>('active');
  protected readonly error = signal<string | null>(null);
  protected readonly rsvpOptions: SegmentOption[] = [
    { value: 'in', label: 'In' },
    { value: 'out', label: 'Out' },
  ];

  protected readonly tabs = computed<SegmentOption[]>(() => [
    { value: 'active', label: `Active (${this.events.active().length})` },
    { value: 'upcoming', label: `Upcoming (${this.events.upcoming().length})` },
    { value: 'completed', label: `Completed (${this.events.completed().length})` },
  ]);
  protected readonly visible = computed(() => this.events[this.tab()]());

  constructor() {
    // (Re)load whenever the active household changes.
    effect(() => {
      this.auth.activeHouseholdId();
      untracked(() => {
        void this.events.load();
        void this.catalog.load();
      });
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(this.events.watch());
    this.destroyRef.onDestroy(this.catalog.watch());
  }

  protected isOpen(e: Meal): boolean {
    return isRsvpOpen(e, this.now());
  }

  protected summary(e: Meal): string[] {
    const items = this.catalog.itemsById();
    return (this.events.myEntries()[e.id] ?? []).flatMap((entry) => {
      const item = items.get(entry.item_id);
      return item ? [`${formatAmount(item.kind, Number(entry.amount))} ${item.name}`] : [];
    });
  }

  protected async rsvp(mealId: string, value: string | null): Promise<void> {
    if (value !== 'in' && value !== 'out') return;
    this.error.set(null);
    const result = await this.events.setAvailability(mealId, value as RsvpStatus);
    if (result.error) this.error.set(`Couldn’t update your availability: ${result.error}`);
  }
}
