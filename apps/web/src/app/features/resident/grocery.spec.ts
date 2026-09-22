import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GroceryStore } from '@cooklog/data-access';
import { fakeAuth, fakeGrocery } from '../../../testing/fake-stores';
import { Grocery } from './grocery';

function setup(grocery = fakeGrocery()) {
  TestBed.configureTestingModule({
    imports: [Grocery],
    providers: [provideRouter([]), grocery, fakeAuth()],
  });
  const fixture = TestBed.createComponent(Grocery);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const store = TestBed.inject(GroceryStore) as unknown as ReturnType<
    typeof fakeGrocery
  >['useValue'];
  const boxes = () => [...el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  return { fixture, el, store, boxes };
}

describe('Grocery', () => {
  it('lists what is needed and what is in stock', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Needed (1)');
    expect(el.textContent).toContain('In stock (1)');
    expect(el.textContent).toContain('Atta');
    expect(el.textContent).toContain('Oil');
  });

  it('reflects stock state in the checkboxes, with a real label for each', () => {
    const { el, boxes } = setup();
    const [needed, stocked] = boxes();
    expect(needed.checked).toBe(false);
    expect(stocked.checked).toBe(true);

    // Every checkbox is reachable by its own label, not a click handler on a div.
    for (const box of boxes()) {
      expect(el.querySelector(`label[for="${box.id}"]`)).not.toBeNull();
    }
  });

  it('credits whoever added an item', () => {
    const { el } = setup();
    // u1 is the signed-in user in fakeAuth.
    expect(el.textContent).toContain('Added by you');
  });

  it('adds an item from the form', async () => {
    const { fixture, el, store } = setup();
    const input = el.querySelector<HTMLInputElement>('#grocery-name')!;
    input.value = 'Coriander';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(store.add).toHaveBeenCalledWith('Coriander');
  });

  it('ignores a blank submission', async () => {
    const { fixture, el, store } = setup();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(store.add).not.toHaveBeenCalled();
  });

  it('ticking a needed item marks it stocked', async () => {
    const { fixture, store, boxes } = setup();
    boxes()[0].click();
    await fixture.whenStable();

    expect(store.setStatus).toHaveBeenCalledWith('g1', 'stocked');
  });

  it('unticking a stocked item puts it back on the list', async () => {
    const { fixture, store, boxes } = setup();
    boxes()[1].click();
    await fixture.whenStable();

    expect(store.setStatus).toHaveBeenCalledWith('g2', 'missing');
  });

  it('removes an item by its labelled button', async () => {
    const { fixture, el, store } = setup();
    el.querySelector<HTMLElement>('button[aria-label="Remove Atta"]')!.click();
    await fixture.whenStable();

    expect(store.remove).toHaveBeenCalledWith('g1');
  });

  it('surfaces a rejected write', async () => {
    const { fixture, el } = setup(
      fakeGrocery({ setStatus: vi.fn(async () => ({ error: 'Could not update that item' })) }),
    );
    el.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Could not update that item');
  });

  it('invites the first item when the list is empty', () => {
    const { el } = setup(
      fakeGrocery({ items: signal([]), missing: signal([]), stocked: signal([]) }),
    );
    expect(el.textContent).toContain('Nothing on the list');
  });

  it('announces loading politely', () => {
    const { el } = setup(
      fakeGrocery({
        loading: signal(true),
        items: signal([]),
        missing: signal([]),
        stocked: signal([]),
      }),
    );
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Loading');
  });

  it('keeps the realtime subscription for the life of the page', () => {
    const { fixture, store } = setup();
    expect(store.watch).toHaveBeenCalled();
    expect(store.load).toHaveBeenCalled();
    fixture.destroy();
  });
});
