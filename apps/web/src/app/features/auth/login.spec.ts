import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { Login } from './login';

function setup() {
  const auth = {
    signInWithGoogle: vi.fn(async () => ({ error: null as string | null })),
    signIn: vi.fn(async (_e: string, _p: string) => ({ error: null as string | null })),
  };
  TestBed.configureTestingModule({
    imports: [Login],
    providers: [provideRouter([]), { provide: AuthStore, useValue: auth }],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(Login);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const google = () => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Google'))!;
  return { fixture, el, auth, navigate, google };
}

describe('Login', () => {
  it('sends the user to Google', async () => {
    const { fixture, auth, google } = setup();
    google().click();
    await fixture.whenStable();
    expect(auth.signInWithGoogle).toHaveBeenCalled();
  });

  /** The tab is already navigating away, so the button must not go back to idle. */
  it('stays busy while the redirect is in flight', async () => {
    const { fixture, google } = setup();
    google().click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(google().textContent).toContain('Redirecting');
  });

  it('shows an error if the redirect never happens', async () => {
    const { fixture, el, auth, google } = setup();
    auth.signInWithGoogle.mockResolvedValueOnce({ error: 'provider is not enabled' });
    google().click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('provider is not enabled');
    expect(google().textContent).toContain('Continue with Google');
  });

  it('offers the local dev password form outside production', () => {
    expect(setup().el.textContent).toContain('Local dev sign-in');
  });
});
