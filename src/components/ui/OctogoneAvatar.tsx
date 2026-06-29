'use client';

export function OctogoneAvatar({ size = 32 }: { size?: number }) {
  const r = size / 2;
  const n = 8;
  const points = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / n;
    return `${r + (r - 2) * Math.cos(angle)},${r + (r - 2) * Math.sin(angle)}`;
  }).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0 animate-spin-slow"
    >
      <defs>
        <linearGradient id="oct-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6D28D9" />
          <stop offset="50%" stopColor="#C026D3" />
          <stop offset="100%" stopColor="#FF3D7F" />
        </linearGradient>
      </defs>
      <polygon points={points} fill="none" stroke="url(#oct-grad)" strokeWidth="2" />
      <polygon points={points} fill="url(#oct-grad)" fillOpacity="0.15" />
    </svg>
  );
}
