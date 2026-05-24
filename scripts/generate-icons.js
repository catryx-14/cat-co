import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const BG_COLOR = 0x122442ff; // mid navy blue
const SIZES = [
  { size: 180, out: 'icon-180.png' },
  { size: 192, out: 'icon-192.png' },
  { size: 512, out: 'icon-512.png' },
];

const logo = await Jimp.read(path.join(root, 'public/assets/logo.png'));

for (const { size, out } of SIZES) {
  const pad = Math.round(size * 0.1);
  const logoSize = size - pad * 2;

  // Remove white background so the gold cat sits cleanly on the navy
  const orig = logo.clone();
  orig.scan(0, 0, orig.width, orig.height, (px, py, idx) => {
    const r = orig.bitmap.data[idx];
    const g = orig.bitmap.data[idx + 1];
    const b = orig.bitmap.data[idx + 2];
    if (r > 200 && g > 200 && b > 200) {
      orig.bitmap.data[idx + 3] = 0; // make white pixels transparent
    }
  });
  const aspect = orig.width / orig.height;
  const fitW = aspect >= 1 ? logoSize : Math.round(logoSize * aspect);
  const fitH = aspect >= 1 ? Math.round(logoSize / aspect) : logoSize;
  const resized = orig.resize({ w: fitW, h: fitH });

  const x = Math.round((size - fitW) / 2);
  const y = Math.round((size - fitH) / 2);

  const bg = new Jimp({ width: size, height: size, color: BG_COLOR });
  bg.composite(resized, x, y);

  // Circular mask — make corners transparent
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  bg.scan(0, 0, size, size, (px, py, idx) => {
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    if (dist > r) {
      bg.bitmap.data[idx + 3] = 0;
    }
  });

  await bg.write(path.join(root, `public/icons/${out}`));
  console.log(`✓ ${out} (${size}x${size})`);
}
