// Generates octogone gradient PNG icons using canvas
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#110F16';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const n = 8;

  // Build octogone path
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI - Math.PI / n;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Gradient fill (translucent)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, 'rgba(109, 40, 217, 0.3)');
  grad.addColorStop(0.5, 'rgba(192, 38, 211, 0.3)');
  grad.addColorStop(1, 'rgba(255, 61, 127, 0.3)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Gradient stroke
  const strokeGrad = ctx.createLinearGradient(0, 0, size, size);
  strokeGrad.addColorStop(0, '#6D28D9');
  strokeGrad.addColorStop(0.5, '#C026D3');
  strokeGrad.addColorStop(1, '#FF3D7F');
  ctx.strokeStyle = strokeGrad;
  ctx.lineWidth = size * 0.04;
  ctx.stroke();

  // "H" letter in center
  ctx.font = `bold ${size * 0.38}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  textGrad.addColorStop(0, '#6D28D9');
  textGrad.addColorStop(1, '#FF3D7F');
  ctx.fillStyle = textGrad;
  ctx.fillText('H', cx, cy + size * 0.02);

  return canvas.toBuffer('image/png');
}

try {
  const buf192 = generateIcon(192);
  const buf512 = generateIcon(512);
  writeFileSync('./public/icon-192.png', buf192);
  writeFileSync('./public/icon-512.png', buf512);
  console.log('Icons generated successfully');
} catch (e) {
  console.error('canvas package not available, creating placeholder icons');
  // Create minimal 1x1 PNG as fallback
  const MINIMAL_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  writeFileSync('./public/icon-192.png', MINIMAL_PNG);
  writeFileSync('./public/icon-512.png', MINIMAL_PNG);
}
