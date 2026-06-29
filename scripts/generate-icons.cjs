// Pure-JS PNG icon generator (no native deps)
const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writePng(size, pixels) {
  const chunks = [];

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.concat([typeBytes, data]);
    const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf), 0);
    return Buffer.concat([len, typeBytes, data, crcVal]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  chunks.push(chunk('IHDR', ihdr));

  // IDAT
  const rowLen = size * 3;
  const raw = Buffer.alloc((rowLen + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowLen + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels(x, y, size);
      const off = y * (rowLen + 1) + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  chunks.push(chunk('IDAT', compressed));
  chunks.push(chunk('IEND', Buffer.alloc(0)));

  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]);
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function getGradColor(t) {
  // gradient: #6D28D9 → #C026D3 → #FF3D7F
  if (t < 0.5) {
    const s = t * 2;
    return [lerp(0x6D, 0xC0, s), lerp(0x28, 0x26, s), lerp(0xD9, 0xD3, s)];
  }
  const s = (t - 0.5) * 2;
  return [lerp(0xC0, 0xFF, s), lerp(0x26, 0x3D, s), lerp(0xD3, 0x7F, s)];
}

function generateIcon(size) {
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.44;
  const innerR = size * 0.36;
  const strokeW = size * 0.04;
  const n = 8;

  function octogonePoint(i, r) {
    const angle = (i / n) * 2 * Math.PI - Math.PI / n;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function pointInPolygon(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const outer = Array.from({ length: n }, (_, i) => octogonePoint(i, outerR));
  const inner = Array.from({ length: n }, (_, i) => octogonePoint(i, innerR - strokeW));

  return writeFloat(size, (x, y, s) => {
    const inOuter = pointInPolygon(x, y, outer);
    const inInner = pointInPolygon(x, y, inner);

    // Background
    const bg = [0x11, 0x0F, 0x16];

    if (!inOuter) return bg;

    const t = (x / s + y / s) / 2;
    const [gr, gg, gb] = getGradColor(t);

    if (!inInner) {
      // Stroke area — gradient
      return [gr, gg, gb];
    }

    // Interior — dark with slight gradient tint
    return [
      Math.round(bg[0] * 0.7 + gr * 0.3),
      Math.round(bg[1] * 0.7 + gg * 0.3),
      Math.round(bg[2] * 0.7 + gb * 0.3),
    ];
  });
}

function writeFloat(size, pixelFn) {
  return writePng(size, pixelFn);
}

const buf192 = generateIcon(192);
const buf512 = generateIcon(512);
fs.writeFileSync('./public/icon-192.png', buf192);
fs.writeFileSync('./public/icon-512.png', buf512);
console.log('Icons generated ✓');
