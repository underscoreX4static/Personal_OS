'use client';

import { OctogoneAvatar } from './OctogoneAvatar';
import { useAppStore } from '@/store/useAppStore';

export function TopBar() {
  const { theme, setTheme } = useAppStore();

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-line bg-bg px-4"
      style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(52px + env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-2">
        <OctogoneAvatar size={28} />
        <span className="font-display text-xl font-bold uppercase tracking-widest text-ink">
          HERMES
        </span>
      </div>
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="flex h-11 w-11 items-center justify-center rounded-full text-xl transition-opacity active:opacity-60"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </button>
    </header>
  );
}
