import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const svg = readFileSync(resolve('public/icons/icon.svg'));

const out = (name) => resolve('src/app', name);

const sizes = [16, 32, 48];

const pngBuffers = await Promise.all(
  sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()),
);

const icoBuffer = await pngToIco(pngBuffers);
writeFileSync(out('favicon.ico'), icoBuffer);

await sharp(svg).resize(180, 180).png().toFile(out('apple-icon.png'));

console.log('Wrote', out('favicon.ico'), 'and', out('apple-icon.png'));
