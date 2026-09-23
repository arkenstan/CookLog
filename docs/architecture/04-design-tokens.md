# 4. Design Tokens & Theme Setup

Package: [`packages/design-tokens`](../../packages/design-tokens): `preset.js` (Tailwind config) + `theme.css` (variables, base, utilities).

## Tailwind version note
Tailwind v4 is CSS-first, but still loads a JS config through `@config`. We keep `tailwind.config.js`-style tokens in a shared **preset** (as requested) and wire it in each app:

```css
/* apps/web/src/styles.css */
@import 'tailwindcss';
@config '../tailwind.config.js';          /* export default { presets: [preset] } */
@import '@cooklog/design-tokens/theme.css';
```
Verified to compile under Tailwind 4.3.

## Strategy
- **Variables carry values, the preset carries names.** Every semantic color (`background`, `card`, `primary`, `border`, `glow`, ...) is `var(--x)`, so light/dark swap by toggling one class, with no utility regeneration. Same contract as shadcn/Spartan, so Spartan "helm" components theme automatically.
- **Dark first.** `:root` is dark (`zinc-950` background, `#111113` cards, `zinc-800` borders). `:root.light` overrides. Set the class on `<html>` in an inline script before bootstrap to avoid a flash; default to dark unless the user chose light.
- **Accents that pop.** Primary neon lime, secondary accent cyan; `--glow` powers `shadow-glow`, and `glow-border` gives a gradient ring for key actions (e.g. "Food is Ready").
- **Shape and type.** `--radius: 0.75rem` (`rounded-lg`), `rounded-xl` = +4px. Geist Sans/Mono self-hosted via Fontsource. KDS sizes `text-kds-md|lg|xl` for the cook's docket.
- **Breakpoints.** `xs 480 / sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536 / kds 1920`.
- **Bento.** `bento` utility = `auto-fit` grid (`minmax(min(100%, 16rem), 1fr)`), dense flow. Tiles opt into spans (`col-span-2 row-span-2`) at `md:`+, and collapse to one column on phones without breakpoints.
- **Motion.** Only `transform`/`opacity` (compositor-friendly). `press` gives active-scale feedback; `animate-fade-up` for entrances; `ease-out-expo` + `duration-fast|base|slow` tokens. `prefers-reduced-motion` disables it globally. Route transitions use the View Transitions API (`withViewTransitions()`).
- **Native feel.** `overscroll-behavior: none` and no tap highlight, which also supports the KDS no-pull-to-refresh requirement.
