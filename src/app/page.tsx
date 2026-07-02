'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TopBar } from '@/components/ui/TopBar';
import { BottomNav } from '@/components/ui/BottomNav';
import { ChatTab } from '@/components/chat/ChatTab';
import { ProfileTab } from '@/components/profile/ProfileTab';
import { PlanningTab } from '@/components/planning/PlanningTab';
import { SystemTab } from '@/components/system/SystemTab';
import { NotificationPermission } from '@/components/NotificationPermission';

export default function Home() {
  const { activeTab, theme } = useAppStore();

  useEffect(() => {
    document.documentElement.className = theme === 'dark' ? 'dark' : 'light';
  }, [theme]);

  const topBarHeight = 'calc(52px + env(safe-area-inset-top))';
  const bottomHeight = 'calc(56px + env(safe-area-inset-bottom))';
  const inputBarHeight = '66px';

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        background: 'var(--bg)',
        color: 'var(--ink)',
      }}
    >
      <TopBar />

      <main
        style={{
          position: 'fixed',
          top: topBarHeight,
          left: 0,
          right: 0,
          bottom: bottomHeight,
          overflow: 'hidden',
        }}
      >
        {/* Chat tab has its own scroll + input bar */}
        <div
          style={{
            display: activeTab === 'chat' ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%',
            paddingBottom: activeTab === 'chat' ? inputBarHeight : 0,
          }}
        >
          <ChatTab />
        </div>

        {activeTab === 'profile' && (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <ProfileTab />
          </div>
        )}
        {activeTab === 'planning' && (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <PlanningTab />
          </div>
        )}
        {activeTab === 'system' && (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <SystemTab />
          </div>
        )}
      </main>

      <BottomNav />
      <NotificationPermission />
    </div>
  );
}
