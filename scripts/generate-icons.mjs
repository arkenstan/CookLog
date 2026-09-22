// Requires ImageMagick 7 (`magick`) and the workspace's installed Tauri CLI.
// Run `pnpm icons` after replacing the square source logo.png.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = join(root, 'apps/web/public');
const iconDir = join(publicDir, 'icons');
const source = join(root, 'logo.png');
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit' });

// Check the web export dependency before regenerating native assets.
run('magick', ['-version']);
run('pnpm', ['--filter', 'desktop-mobile', 'icons']);
// Tauri's compositor can leave alpha=254 at antialiased edges. iOS icons
// must be fully opaque, including when Tauri writes into an initialized project.
for (const directory of [
  'apps/desktop-mobile/src-tauri/icons/ios',
  'apps/desktop-mobile/src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset',
]) {
  const path = join(root, directory);
  if (!existsSync(path)) continue;
  for (const file of readdirSync(path).filter((name) => name.endsWith('.png'))) {
    const icon = join(path, file);
    run('magick', [
      icon,
      '-background',
      '#09090b',
      '-alpha',
      'remove',
      '-alpha',
      'off',
      `PNG24:${icon}`,
    ]);
  }
}
mkdirSync(iconDir, { recursive: true });
copyFileSync(source, join(publicDir, 'logo.png'));

function png(filename, size, scale = 0.8) {
  const contentSize = Math.round(size * scale);
  run('magick', [
    source,
    '-resize',
    `${contentSize}x${contentSize}`,
    '-background',
    '#09090b',
    '-gravity',
    'center',
    '-extent',
    `${size}x${size}`,
    '-alpha',
    'remove',
    '-alpha',
    'off',
    '-strip',
    join(publicDir, filename),
  ]);
}

png('favicon-16x16.png', 16, 1);
png('favicon-32x32.png', 32, 1);
png('apple-touch-icon.png', 180);
png('icons/icon-192.png', 192);
png('icons/icon-512.png', 512);
// The full square mark fits inside the maskable icon's central safe circle.
png('icons/icon-maskable-512.png', 512, 0.56);
run('magick', [
  source,
  '-background',
  '#09090b',
  '-alpha',
  'remove',
  '-alpha',
  'off',
  '-define',
  'icon:auto-resize=48,32,16',
  join(publicDir, 'favicon.ico'),
]);
