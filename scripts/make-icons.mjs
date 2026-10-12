// Draws the extension icon (a disc, warm light on the left, dark on the right)
// into public/icon/<size>.png. No dependencies: writes the PNG by hand.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const LIGHT = [243, 226, 192];
const DARK = [42, 37, 32];
const RING = [199, 131, 44];
const SAMPLES = 4;

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function pixel(x, y, size) {
  const c = size / 2;
  const r = Math.hypot(x - c, y - c) / c;
  if (r > 0.94) return null;
  if (r > 0.8) return RING;
  return x < c ? LIGHT : DARK;
}

function draw(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const p = pixel(x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES, size);
          if (!p) continue;
          r += p[0]; g += p[1]; b += p[2]; a++;
        }
      }
      const o = 1 + x * 4;
      if (a) row.set([r / a, g / a, b / a, (a / SAMPLES ** 2) * 255].map(Math.round), o);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icon', { recursive: true });
for (const size of [16, 32, 48, 128]) writeFileSync(`public/icon/${size}.png`, draw(size));
console.log('icons written');
