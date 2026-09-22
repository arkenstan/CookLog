import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActionResult, AuthStore, GroceryItem, GroceryStore } from '@cooklog/data-access';
import { ZardButtonComponent, ZardCardComponent, ZardInputDirective } from '@cooklog/ui';

/**
 * The shared pantry ledger. Anyone in the household — cook included — can add an
 * ingredient, tick it off once it's bought, or drop it from the list.
 */
@Component({
  selector: 'app-grocery',
  imports: [FormsModule, ReactiveFormsModule, ZardButtonComponent, ZardCardComponent, ZardInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl">
      <h2 class="text-2xl font-semibold tracking-tight">Grocery list</h2>
      <p class="mb-6 text-sm text-muted-foreground">
        What the kitchen is out of. Tick an item once it’s back in the house.
      </p>

      @if (error()) {
        <p class="mb-4 rounded-lg border border-destructive/50 p-3 text-sm text-destructive" role="alert">{{ error() }}</p>
      }

      <z-card>
        <form (ngSubmit)="add()" class="flex flex-wrap items-center gap-2 pb-4">
          <input
            z-input
            id="grocery-name"
            class="max-w-64 flex-1"
            placeholder="Add an item, e.g. Coriander"
            aria-label="Item to add"
            [formControl]="newName"
          />
          <button z-button zType="secondary" type="submit" [zDisabled]="busy()">Add</button>
        </form>

        @if (store.loading() && !store.items().length) {
          <p class="border-t py-3 text-sm text-muted-foreground" role="status">Loading…</p>
        } @else if (!store.items().length) {
          <p class="border-t py-3 text-sm text-muted-foreground">
            Nothing on the list. Add what the kitchen is missing.
          </p>
        }

        @if (store.missing().length) {
          <section class="border-t pt-3">
            <h3 class="text-xs font-medium uppercase tracking-wide text-warning">
              Needed ({{ store.missing().length }})
            </h3>
            <ul class="divide-y">
              @for (item of store.missing(); track item.id) {
                <li class="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    class="size-5 shrink-0 accent-primary"
                    [id]="'grocery-' + item.id"
                    [checked]="false"
                    (change)="toggle(item)"
                  />
                  <label [for]="'grocery-' + item.id" class="flex-1 cursor-pointer">
                    <span class="font-medium">{{ item.name }}</span>
                    <span class="block text-xs text-muted-foreground">{{ addedBy(item) }}</span>
                  </label>
                  <button
                    z-button
                    zType="ghost"
                    type="button"
                    [attr.aria-label]="'Remove ' + item.name"
                    (click)="remove(item.id)"
                  >
                    ✕
                  </button>
                </li>
              }
            </ul>
          </section>
        }

        @if (store.stocked().length) {
          <section class="border-t pt-3">
            <h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              In stock ({{ store.stocked().length }})
            </h3>
            <ul class="divide-y">
              @for (item of store.stocked(); track item.id) {
                <li class="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    class="size-5 shrink-0 accent-primary"
                    [id]="'grocery-' + item.id"
                    [checked]="true"
                    (change)="toggle(item)"
                  />
                  <label [for]="'grocery-' + item.id" class="flex-1 cursor-pointer text-muted-foreground">
                    <span class="font-medium">{{ item.name }}</span>
                  </label>
                  <button
                    z-button
                    zType="ghost"
                    type="button"
                    [attr.aria-label]="'Remove ' + item.name"
                    (click)="remove(item.id)"
                  >
                    ✕
                  </button>
                </li>
              }
            </ul>
          </section>
        }
      </z-card>
    </div>
  `,
})
export class Grocery implements OnInit {
  protected readonly store = inject(GroceryStore);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly newName = new FormControl('', { nonNullable: true });

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

  protected addedBy(item: GroceryItem): string {
    if (!item.added_by) return 'Added when the household was set up';
    if (item.added_by === this.auth.userId()) return 'Added by you';
    const name = this.store.names()[item.added_by];
    return name ? `Added by ${name}` : 'Added by someone in the house';
  }

  protected async add(): Promise<void> {
    const name = this.newName.value.trim();
    if (!name) return;
    this.busy.set(true);
    await this.report(this.store.add(name));
    if (!this.error()) this.newName.reset('');
    this.busy.set(false);
  }

  protected toggle(item: GroceryItem): Promise<void> {
    return this.report(
      this.store.setStatus(item.id, item.status === 'missing' ? 'stocked' : 'missing'),
    );
  }

  protected remove(id: string): Promise<void> {
    return this.report(this.store.remove(id));
  }

  private async report(action: Promise<ActionResult>): Promise<void> {
    this.error.set(null);
    const result = await action;
    if (result.error) this.error.set(result.error);
  }
}
