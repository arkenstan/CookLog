import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { Onboarding } from './onboarding';

function setup(role: 'resident' | 'cook', embedded = false) {
  const auth = {
    role: signal(role),
    createHousehold: vi.fn(async (_name: string) => ({ error: null as string | null })),
    joinHousehold: vi.fn(async (_code: string) => ({ error: null as string | null })),
    signOut: vi.fn(async () => {}),
  };
  TestBed.configureTestingModule({
    imports: [Onboarding],
    providers: [provideRouter([]), { provide: AuthStore, useValue: auth }],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(Onboarding);
  fixture.componentRef.setInput('embedded', embedded);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const submit = async (formIndex: number, field: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${field}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    el.querySelectorAll('form')[formIndex].dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, auth, navigate, submit };
}

describe('Onboarding', () => {
  it('lets a resident create a household', async () => {
    const { auth, navigate, submit } = setup('resident');
    await submit(0, 'hh-name', 'Flat 3B');
    expect(auth.createHousehold).toHaveBeenCalledWith('Flat 3B');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('lets anyone join with a code, and shows errors', async () => {
    const { el, auth, submit } = setup('cook');
    expect(el.querySelector('#hh-name')).toBeNull(); // cooks cannot create
    auth.joinHousehold.mockResolvedValueOnce({ error: 'invalid invite code' });
    await submit(0, 'code', 'zzz');
    expect(auth.joinHousehold).toHaveBeenCalledWith('zzz');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('invalid invite code');
  });

  it('shows Cancel instead of Sign out when embedded', () => {
    const embedded = setup('resident', true).el;
    expect(embedded.textContent).toContain('Add a household');
    expect(embedded.textContent).toContain('Cancel');
    expect(embedded.textContent).not.toContain('Sign out');
  });
});
