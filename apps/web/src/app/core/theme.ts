import { Injectable, signal } from '@angular/core';

/** Dark is the default; light adds the `light` class (see index.html init script). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<'dark' | 'light'>(
    document.documentElement.classList.contains('light') ? 'light' : 'dark',
  );

  toggle(): void {
    const next = this.mode() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('light', next === 'light');
    try {
      localStorage.setItem('theme', next);
    } catch {}
    this.mode.set(next);
  }
}
