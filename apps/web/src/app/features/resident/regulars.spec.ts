import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ITEMS, fakeAuth, fakeCatalog } from '../../../testing/fake-stores';
import { Regulars } from './regulars';

function setup() {
  const catalog = fakeCatalog({
    regulars: signal([{ user_id: 'u1', item_id: 'roti', amount: 4 }]),
    nonRegularItems: signal(ITEMS.filter((i) => i.id !== 'roti')),
  });
  TestBed.configureTestingModule({ imports: [Regulars], providers: [catalog, fakeAuth()] });
  const fixture = TestBed.createComponent(Regulars);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, catalog: catalog.useValue };
}

describe('Regulars', () => {
  it('lists regulars with their amounts and only offers non-regular items to add', () => {
    const { el } = setup();
    expect(el.querySelector('ui-stepper[aria-label="Roti"]')?.textContent).toContain('4 pcs');
    const select = el.querySelector<HTMLSelectElement>('select[aria-label="Item to make regular"]')!;
    expect([...select.options].map((o) => o.textContent?.trim())).toEqual([
      'Add from household items…',
      'Soup (portion)',
      'Bread (count)',
    ]);
  });

  it('changes the amount, removes, and adds a regular', () => {
    const { fixture, el, catalog } = setup();
    el.querySelector<HTMLButtonElement>('ui-stepper[aria-label="Roti"] button[aria-label="Increase"]')!.click();
    expect(catalog.setRegular).toHaveBeenCalledWith('roti', 5);

    el.querySelector<HTMLButtonElement>('button[aria-label="Remove Roti"]')!.click();
    expect(catalog.removeRegular).toHaveBeenCalledWith('roti');

    const select = el.querySelector<HTMLSelectElement>('select[aria-label="Item to make regular"]')!;
    select.value = 'bread';
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Add')!.click();
    fixture.detectChanges();
    expect(catalog.addRegular).toHaveBeenCalledWith('bread');
  });

  it('creates a new catalog item and makes it a regular', async () => {
    const { fixture, el, catalog } = setup();
    const name = el.querySelector<HTMLInputElement>('input[aria-label="New item name"]')!;
    name.value = 'Khichdi';
    name.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(catalog.createItem).toHaveBeenCalledWith('Khichdi', 'count');
    expect(catalog.addRegular).toHaveBeenCalledWith('khichdi');
  });
});
