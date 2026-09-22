import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BottomNav } from './bottom-nav';

@Component({ template: '' })
class Blank {}

describe('BottomNav', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [BottomNav],
      providers: [
        provideRouter([
          { path: 'home', component: Blank },
          { path: 'grocery', component: Blank },
          { path: 'regulars', component: Blank },
        ]),
      ],
    });
    const fixture = TestBed.createComponent(BottomNav);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const links = () => [...el.querySelectorAll<HTMLAnchorElement>('nav a')];
    const labels = () => links().map((a) => a.textContent?.replace(/\s+/g, ' ').trim());
    return { fixture, el, links, labels };
  }

  it('reaches every resident destination', () => {
    const { links, labels } = setup();
    expect(links().map((a) => a.getAttribute('href'))).toEqual(['/home', '/grocery', '/regulars']);
    expect(labels()).toEqual(['Events', 'Grocery', 'Regulars']);
  });

  it('is a labelled landmark so screen readers can find it', () => {
    const { el } = setup();
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Primary');
  });

  it('marks exactly the active destination with aria-current', async () => {
    const { fixture, links } = setup();
    await TestBed.inject(Router).navigateByUrl('/regulars');
    fixture.detectChanges();

    const current = links().filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Regulars');
  });

  it('does not mark Events as active on another route', async () => {
    const { fixture, links } = setup();
    await TestBed.inject(Router).navigateByUrl('/grocery');
    fixture.detectChanges();

    expect(links()[0].getAttribute('aria-current')).toBeNull();
    expect(links()[1].getAttribute('aria-current')).toBe('page');
  });

  it('hides the decorative icons from assistive tech', () => {
    const { el } = setup();
    const icons = [...el.querySelectorAll('nav a z-icon')];
    expect(icons).toHaveLength(3);
    // ZardUI's Lucide glyphs are decorative here; the link text carries the name.
    expect(icons.every((g) => g.querySelector('svg')?.getAttribute('stroke') === 'currentColor')).toBe(true);
  });
});
