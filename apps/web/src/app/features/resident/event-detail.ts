import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ActionResult,
  AuthStore,
  CatalogStore,
  EventsStore,
  ItemKind,
  RsvpStatus,
  formatAmount,
  isRsvpOpen,
  stepFor,
} from '@cooklog/data-access';
import { SegmentOption, UiButton, UiCard, UiInput, UiSegmented, UiStepper } from '@cooklog/ui';
import { injectNow } from '../../core/now';

@Component({
  selector: 'app-event-detail',
  imports: [DatePipe, RouterLink, FormsModule, ReactiveFormsModule, UiButton, UiCard, UiInput, UiSegmented, UiStepper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/home" class="text-sm text-muted-foreground hover:underline">← Meal events</a>

    @if (event(); as e) {
      <div class="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ e.type }}</p>
          <h2 class="text-2xl font-semibold tracking-tight">{{ e.title }}</h2>
          <p class="text-sm text-muted-foreground">{{ e.starts_at | date: 'EEEE d MMM · h:mm a' }}</p>
        </div>
        <span class="rounded-lg border px-2 py-1 text-xs" [class]="open() ? 'text-muted-foreground' : 'text-warning'">
          {{ open() ? 'RSVPs & items open until ' + (e.cutoff_at | date: 'h:mm a') : 'Closed for changes' }}
        </span>
      </div>

      @if (error()) {
        <p class="mb-4 rounded-lg border border-destructive/50 p-3 text-sm text-destructive" role="alert">{{ error() }}</p>
      }

      <section class="bento">
        <ui-card>
          <h3 class="font-medium">Your availability</h3>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
            <ui-segmented label="Availability" [options]="rsvpOptions" [value]="events.myRsvps()[e.id] ?? null" [disabled]="!open()" (valueChange)="rsvp($event)" />
            <p class="text-sm text-muted-foreground"><span class="text-lg font-semibold text-foreground">{{ events.inCounts()[e.id] ?? 0 }}</span> in</p>
          </div>
          <dl class="mt-4 space-y-1 border-t pt-3 text-sm">
            <div class="flex gap-2"><dt class="w-8 text-muted-foreground">In</dt><dd>{{ names('in') || '—' }}</dd></div>
            <div class="flex gap-2"><dt class="w-8 text-muted-foreground">Out</dt><dd>{{ names('out') || '—' }}</dd></div>
          </dl>
        </ui-card>

        <ui-card>
          <h3 class="font-medium">Everyone’s items</h3>
          <p class="text-xs text-muted-foreground">Totals for residents who are in — what the cook prepares.</p>
          <ul class="mt-3 space-y-2">
            @for (row of totalRows(); track row.id) {
              <li class="flex items-center justify-between text-sm">
                <span>{{ row.name }}</span>
                <span class="font-semibold">{{ row.text }}</span>
              </li>
            } @empty {
              <li class="text-sm text-muted-foreground">No items yet.</li>
            }
          </ul>
        </ui-card>

        <ui-card class="md:col-span-2">
          <div class="flex items-center justify-between">
            <h3 class="font-medium">Your items</h3>
            <a routerLink="/regulars" class="text-sm text-primary hover:underline">Manage regulars</a>
          </div>
          @if (events.myRsvps()[e.id] === 'out') {
            <p class="mt-2 text-sm text-warning">You’re marked Out, so these items aren’t counted.</p>
          }

          <ul class="mt-3 divide-y">
            @for (row of myRows(); track row.id) {
              <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p class="font-medium">{{ row.name }}</p>
                  <p class="text-xs text-muted-foreground">{{ row.kind === 'count' ? 'Count' : 'Portion' }}{{ row.regular ? ' · regular' : '' }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <ui-stepper [label]="row.name" [value]="row.amount" [step]="row.step" [unit]="row.unit" [disabled]="!open()" (changed)="setAmount(row.id, $event)" />
                  <button uiButton variant="ghost" type="button" [disabled]="!open()" [attr.aria-label]="'Remove ' + row.name" (click)="remove(row.id)">✕</button>
                </div>
              </li>
            } @empty {
              <li class="py-3 text-sm text-muted-foreground">You haven’t added anything. Add items below.</li>
            }
          </ul>

          @if (open()) {
            <div class="mt-4 space-y-4 border-t pt-4">
              <div class="flex flex-wrap items-center gap-2">
                <select uiInput class="max-w-64" aria-label="Item to add" #pick>
                  <option value="">Add an item…</option>
                  @for (i of addable(); track i.id) {
                    <option [value]="i.id">{{ i.name }} ({{ i.kind === 'count' ? 'count' : 'portion' }})</option>
                  }
                </select>
                <button uiButton variant="secondary" type="button" (click)="addExisting(pick.value); pick.value = ''">Add</button>
              </div>

              <form (ngSubmit)="createAndAdd()" class="flex flex-wrap items-center gap-2">
                <input uiInput class="max-w-48" placeholder="New item, e.g. Khichdi" aria-label="New item name" [formControl]="newName" />
                <ui-segmented label="New item kind" [options]="kindOptions" [value]="newKind()" (valueChange)="newKind.set($any($event))" />
                <button uiButton variant="secondary" type="submit" [disabled]="busy()">Create & add</button>
              </form>
              <p class="text-xs text-muted-foreground">Count items go up by 1 (bread, roti). Portion items go up by ½ (soup, dal, rice).</p>
            </div>
          }
        </ui-card>
      </section>
    } @else if (events.loading()) {
      <p class="mt-4 text-muted-foreground">Loading…</p>
    } @else {
      <ui-card class="mt-4">
        <p class="font-medium">We couldn’t find that event.</p>
        <a routerLink="/home" class="mt-2 inline-block text-sm text-primary hover:underline">Back to meal events</a>
      </ui-card>
    }
  `,
})
export class EventDetail implements OnInit {
  /** Bound from the `:id` route param. */
  readonly id = input.required<string>();

  protected readonly events = inject(EventsStore);
  private readonly catalog = inject(CatalogStore);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly now = injectNow();
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly newName = new FormControl('', { nonNullable: true });
  protected readonly newKind = signal<ItemKind>('count');
  protected readonly rsvpOptions: SegmentOption[] = [
    { value: 'in', label: 'In' },
    { value: 'out', label: 'Out' },
  ];
  protected readonly kindOptions: SegmentOption[] = [
    { value: 'count', label: 'Count' },
    { value: 'portion', label: 'Portion' },
  ];

  protected readonly event = computed(() => this.events.events().find((e) => e.id === this.id()) ?? null);
  protected readonly open = computed(() => {
    const e = this.event();
    return e ? isRsvpOpen(e, this.now()) : false;
  });

  protected readonly myRows = computed(() => {
    const items = this.catalog.itemsById();
    return (this.events.myEntries()[this.id()] ?? []).flatMap((entry) => {
      const item = items.get(entry.item_id);
      if (!item) return [];
      return [{
        id: item.id,
        name: item.name,
        kind: item.kind,
        amount: Number(entry.amount),
        step: stepFor(item.kind),
        unit: item.kind === 'count' ? 'pcs' : 'portions',
        regular: entry.source === 'regular',
      }];
    });
  });

  protected readonly addable = computed(() => {
    const mine = new Set(this.myRows().map((r) => r.id));
    return this.catalog.items().filter((i) => !mine.has(i.id));
  });

  protected readonly totalRows = computed(() => {
    const items = this.catalog.itemsById();
    return Object.entries(this.events.totals()[this.id()] ?? {})
      .flatMap(([itemId, total]) => {
        const item = items.get(itemId);
        return item ? [{ id: itemId, name: item.name, text: formatAmount(item.kind, total) }] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  constructor() {
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

  protected names(status: RsvpStatus): string {
    const names = this.events.names();
    return this.events
      .rsvps()
      .filter((r) => r.meal_id === this.id() && r.status === status)
      .map((r) => names[r.user_id] ?? 'Someone')
      .join(', ');
  }

  protected rsvp(value: string | null): Promise<void> {
    if (value !== 'in' && value !== 'out') return Promise.resolve();
    return this.report(this.events.setAvailability(this.id(), value));
  }

  protected setAmount(itemId: string, amount: number): Promise<void> {
    return this.report(this.events.setAmount(this.id(), itemId, amount));
  }

  protected remove(itemId: string): Promise<void> {
    return this.report(this.events.removeEntry(this.id(), itemId));
  }

  protected async addExisting(itemId: string): Promise<void> {
    const item = this.catalog.itemsById().get(itemId);
    if (item) await this.report(this.events.addOne(this.id(), item.id, item.kind));
  }

  protected async createAndAdd(): Promise<void> {
    const name = this.newName.value.trim();
    if (!name) return;
    this.busy.set(true);
    const created = await this.catalog.createItem(name, this.newKind());
    if (created.error || !created.id) {
      this.error.set(created.error);
    } else {
      await this.report(this.events.addOne(this.id(), created.id, this.newKind()));
      this.newName.reset('');
    }
    this.busy.set(false);
  }

  private async report(action: Promise<ActionResult>): Promise<void> {
    this.error.set(null);
    const result = await action;
    if (result.error) this.error.set(result.error);
  }
}
