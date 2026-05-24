import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const LIGHT_GRAY = 0x122442ff; // mid navy blue
const SIZES = [
  { size: 180, out: 'icon-180.png' },
  { size: 192, out: 'icon-192.png' },
  { size: 512, out: 'icon-512.png' },
];

const logo = await Jimp.read(path.join(root, 'public/assets/logo.png'));

for (const { size, out } of SIZES) {
  const pad = Math.round(size * 0.1);
  const logoSize = size - pad * 2;

  const orig = logo.clone();
  const aspect = orig.width / orig.height;
  const fitW = aspect >= 1 ? logoSize : Math.round(logoSize * aspect);
  const fitH = aspect >= 1 ? Math.round(logoSize / aspect) : logoSize;
  const resized = orig.resize({ w: fitW, h: fitH });

  const x = Math.round((size - fitW) / 2);
  const y = Math.round((size - fitH) / 2);

  const bg = new Jimp({ width: size, height: size, color: LIGHT_GRAY });
  bg.composite(resized, x, y);

  await bg.write(path.join(root, `public/icons/${out}`));
  console.log(`✓ ${out} (${size}x${size})`);
}
