import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore, UserRole } from '@cooklog/data-access';
import { ProfileSetup } from './profile-setup';

function setup() {
  const auth = {
    completeProfile: vi.fn(async (_u: string, _r: UserRole) => ({ error: null as string | null })),
    signOut: vi.fn(async () => {}),
  };
  TestBed.configureTestingModule({
    imports: [ProfileSetup],
    providers: [provideRouter([]), { provide: AuthStore, useValue: auth }],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ProfileSetup);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const submit = async (value: string) => {
    const input = el.querySelector<HTMLInputElement>('#username')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, auth, navigate, submit };
}

describe('ProfileSetup', () => {
  it('saves the username and the default role, then leaves', async () => {
    const { auth, navigate, submit } = setup();
    await submit('Asha');
    expect(auth.completeProfile).toHaveBeenCalledWith('Asha', 'resident');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('surfaces the server error when the username is taken', async () => {
    const { el, auth, submit } = setup();
    auth.completeProfile.mockResolvedValueOnce({ error: 'That username is taken' });
    await submit('Asha');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('That username is taken');
  });

  it.each(['ab', 'as ha', 'as.ha', 'a'.repeat(21)])(
    'never sends %s to the server',
    async (value) => {
      const { auth, navigate, submit } = setup();
      await submit(value);
      expect(auth.completeProfile).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('offers a way out for a user who does not want to continue', async () => {
    const { el, auth, navigate } = setup();
    const signOut = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Sign out'))!;
    signOut.click();
    await Promise.resolve();
    expect(auth.signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/auth/login');
  });
});
