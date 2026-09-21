import { DestroyRef, Signal, inject, signal } from '@angular/core';

/** A signal holding `Date.now()`, refreshed on an interval so cutoffs lock on screen in time. */
export function injectNow(intervalMs = 15_000): Signal<number> {
  const now = signal(Date.now());
  const timer = setInterval(() => now.set(Date.now()), intervalMs);
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
  return now.asReadonly();
}
