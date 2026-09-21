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
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActionResult, AuthStore, CatalogStore, ItemKind, stepFor } from '@cooklog/data-access';
import { SegmentOption, UiButton, UiCard, UiInput, UiSegmented, UiStepper } from '@cooklog/ui';

/** Items added automatically to every event you mark "In" (roti, rice, bread…). */
@Component({
  selector: 'app-regulars',
  imports: [FormsModule, ReactiveFormsModule, UiButton, UiCard, UiInput, UiSegmented, UiStepper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl">
      <h2 class="text-2xl font-semibold tracking-tight">Regular items</h2>
      <p class="mb-6 text-sm text-muted-foreground">
        These are added to each meal event when you’re In. You can still change them per event.
        Updates apply to future events.
      </p>

      @if (error()) {
        <p class="mb-4 rounded-lg border border-destructive/50 p-3 text-sm text-destructive" role="alert">{{ error() }}</p>
      }

      <ui-card>
        <ul class="divide-y">
          @for (row of rows(); track row.id) {
            <li class="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p class="font-medium">{{ row.name }}</p>
                <p class="text-xs text-muted-foreground">{{ row.kind === 'count' ? 'Count · whole units' : 'Portion · half servings' }}</p>
              </div>
              <div class="flex items-center gap-2">
                <ui-stepper [label]="row.name" [value]="row.amount" [step]="row.step" [unit]="row.unit" (changed)="set(row.id, $event)" />
                <button uiButton variant="ghost" type="button" [attr.aria-label]="'Remove ' + row.name" (click)="remove(row.id)">✕</button>
              </div>
            </li>
          } @empty {
            <li class="py-3 text-sm text-muted-foreground">No regulars yet. Add roti, rice, bread — whatever you have every day.</li>
          }
        </ul>

        <div class="mt-4 space-y-4 border-t pt-4">
          <div class="flex flex-wrap items-center gap-2">
            <select uiInput class="max-w-64" aria-label="Item to make regular" #pick>
              <option value="">Add from household items…</option>
              @for (i of catalog.nonRegularItems(); track i.id) {
                <option [value]="i.id">{{ i.name }} ({{ i.kind === 'count' ? 'count' : 'portion' }})</option>
              }
            </select>
            <button uiButton variant="secondary" type="button" (click)="addExisting(pick.value); pick.value = ''">Add</button>
          </div>

          <form (ngSubmit)="createAndAdd()" class="flex flex-wrap items-center gap-2">
            <input uiInput class="max-w-48" placeholder="New item, e.g. Paratha" aria-label="New item name" [formControl]="newName" />
            <ui-segmented label="New item kind" [options]="kindOptions" [value]="newKind()" (valueChange)="newKind.set($any($event))" />
            <button uiButton variant="secondary" type="submit" [disabled]="busy()">Create & add</button>
          </form>
        </div>
      </ui-card>
    </div>
  `,
})
export class Regulars implements OnInit {
  protected readonly catalog = inject(CatalogStore);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly newName = new FormControl('', { nonNullable: true });
  protected readonly newKind = signal<ItemKind>('count');
  protected readonly kindOptions: SegmentOption[] = [
    { value: 'count', label: 'Count' },
    { value: 'portion', label: 'Portion' },
  ];

  protected readonly rows = computed(() => {
    const items = this.catalog.itemsById();
    return this.catalog.regulars().flatMap((r) => {
      const item = items.get(r.item_id);
      if (!item) return [];
      return [{
        id: item.id,
        name: item.name,
        kind: item.kind,
        amount: Number(r.amount),
        step: stepFor(item.kind),
        unit: item.kind === 'count' ? 'pcs' : 'portions',
      }];
    });
  });

  constructor() {
    effect(() => {
      this.auth.activeHouseholdId();
      untracked(() => void this.catalog.load());
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(this.catalog.watch());
  }

  protected set(itemId: string, amount: number): Promise<void> {
    return this.report(this.catalog.setRegular(itemId, amount));
  }

  protected remove(itemId: string): Promise<void> {
    return this.report(this.catalog.removeRegular(itemId));
  }

  protected addExisting(itemId: string): Promise<void> {
    return itemId ? this.report(this.catalog.addRegular(itemId)) : Promise.resolve();
  }

  protected async createAndAdd(): Promise<void> {
    const name = this.newName.value.trim();
    if (!name) return;
    this.busy.set(true);
    const created = await this.catalog.createItem(name, this.newKind());
    if (created.error || !created.id) this.error.set(created.error);
    else {
      await this.report(this.catalog.addRegular(created.id));
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
