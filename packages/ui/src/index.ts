// ── ZardUI primitives ───────────────────────────────────────────────────────
// Vendored source (shadcn-style: this code is ours to edit). Re-pointed at
// @ng-icons/lucide because ZardUI's lucide-angular peer range stops at Angular 21.
export { provideZard } from './lib/zard/core/provider/providezard';
export * from './lib/zard/components/button';
export * from './lib/zard/components/card';
export * from './lib/zard/components/dropdown';
export * from './lib/zard/components/input';
export * from './lib/zard/components/menu';
export * from './lib/zard/components/input-group';
export * from './lib/zard/components/toggle';
export * from './lib/zard/components/toggle-group';
export * from './lib/zard/components/icon';

// ── Ours: no ZardUI equivalent, built on ZardUI primitives ──────────────────
export { UiField } from './lib/field';
export { UiStat } from './lib/stat';
export { UiStepper } from './lib/stepper';
