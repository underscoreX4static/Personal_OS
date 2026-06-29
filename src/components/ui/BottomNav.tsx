'use client';

import { useAppStore, TabId } from '@/store/useAppStore';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'profile', label: 'Profil', icon: '👤' },
  { id: 'planning', label: 'Planning', icon: '📋' },
  { id: 'system', label: 'Système', icon: '⚙️' },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-line bg-bg2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-opacity"
            style={{ minHeight: 56 }}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span
              className={`font-mono text-[10px] uppercase tracking-widest transition-colors ${
                active ? 'text-violet-400' : 'text-mut'
              }`}
            >
              {tab.label}
            </span>
            {active && (
              <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-gradient-to-r from-violet-600 to-pink-500" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
