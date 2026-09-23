// Requires ImageMagick 7 (`magick`).
// Run `pnpm icons` after replacing the square source logo.png.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = join(root, 'apps/web/public');
const iconDir = join(publicDir, 'icons');
const source = join(root, 'logo.png');
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit' });

run('magick', ['-version']);
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
