import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SOURCE = 'C:\\Users\\catry\\OneDrive\\Pictures\\Art for Site\\Logo\\white logo icon.png';
const SIZES = [
  { size: 180, out: 'icon-180.png' },
  { size: 192, out: 'icon-192.png' },
  { size: 512, out: 'icon-512.png' },
];

const logo = await Jimp.read(SOURCE);

for (const { size, out } of SIZES) {
  await logo.clone()
    .resize({ w: size, h: size })
    .write(path.join(root, `public/icons/${out}`));
  console.log(`✓ ${out} (${size}x${size})`);
}
