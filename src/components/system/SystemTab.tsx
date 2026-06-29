'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getJournal, getReminders, getOnboardingPool } from '@/lib/db';
import { generateMorningBriefing, generateEveningRecap } from '@/lib/hermes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { JournalEntry } from '@/types';

const AGENTS = [
  { name: 'Morning Briefing', status: 'scheduled', time: '07:30' },
  { name: 'Evening Recap', status: 'scheduled', time: '21:00' },
  { name: 'Reminder Daemon', status: 'active', time: null },
  { name: 'Onboarding Coach', status: 'active', time: null },
  { name: 'Decision Coach', status: 'active', time: null },
  { name: 'Project Tracker', status: 'active', time: null },
  { name: 'Journal Logger', status: 'active', time: null },
  { name: 'Profile Builder', status: 'active', time: null },
  { name: 'Intent Detector', status: 'active', time: null },
  { name: 'Notification Push', status: 'standby', time: null },
  { name: 'Voice STT', status: 'standby', time: null },
  { name: 'Claude API Bridge', status: 'standby', time: null },
];

export function SystemTab() {
  const { messages, onboardingPool, reminders } = useAppStore();
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [j, r, pool] = await Promise.all([getJournal(), getReminders(), getOnboardingPool()]);
      setJournal(j.slice(-20).reverse());
      setLoading(false);
    })();
  }, []);

  const todayMessages = messages.filter(
    (m) => new Date(m.timestamp).toDateString() === new Date().toDateString()
  );
  const doneQ = onboardingPool.filter((q) => q.done).length;
  const activeR = reminders.filter((r) => !r.triggered).length;

  const simulate = async (type: 'morning' | 'evening') => {
    const text = type === 'morning' ? await generateMorningBriefing() : await generateEveningRecap();
    setOutput(text);
  };

  return (
    <div className="overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Messages', value: todayMessages.length },
          { label: 'Onboarding', value: `${doneQ}/25` },
          { label: 'Reminders', value: activeR },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-card p-3 text-center" style={{ border: '1px solid #272232' }}>
            <p className="font-display text-xl font-bold text-ink">{value}</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase text-mut">{label}</p>
          </div>
        ))}
      </div>

      {/* Simulation buttons */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => simulate('morning')}
          className="flex-1 rounded-xl py-2.5 text-xs font-medium text-white transition-opacity active:opacity-70"
          style={{ background: 'linear-gradient(135deg, #6D28D9, #C026D3)' }}
        >
          Simuler Morning
        </button>
        <button
          onClick={() => simulate('evening')}
          className="flex-1 rounded-xl py-2.5 text-xs font-medium text-white transition-opacity active:opacity-70"
          style={{ background: 'linear-gradient(135deg, #C026D3, #FF3D7F)' }}
        >
          Simuler Evening
        </button>
      </div>

      {output && (
        <div className="mb-4 rounded-2xl bg-card p-4" style={{ border: '1px solid #272232' }}>
          <p
            className="whitespace-pre-line text-sm text-ink"
            dangerouslySetInnerHTML={{ __html: output.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/_(.+?)_/g, '<em>$1</em>') }}
          />
          <button onClick={() => setOutput('')} className="mt-2 text-xs text-mut">Fermer</button>
        </div>
      )}

      {/* Agents */}
      <div className="mb-4 rounded-2xl bg-card p-4" style={{ border: '1px solid #272232' }}>
        <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-violet-400">
          Agents ({AGENTS.length})
        </h3>
        <div className="space-y-2">
          {AGENTS.map((agent) => (
            <div key={agent.name} className="flex items-center justify-between">
              <span className="text-xs text-ink">{agent.name}</span>
              <div className="flex items-center gap-1.5">
                {agent.time && <span className="font-mono text-[10px] text-mut">{agent.time}</span>}
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    agent.status === 'active'
                      ? 'bg-green-400'
                      : agent.status === 'scheduled'
                      ? 'bg-violet-400'
                      : 'bg-mut'
                  }`}
                />
                <span className="font-mono text-[10px] text-mut">{agent.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Journal */}
      <div className="rounded-2xl bg-card p-4" style={{ border: '1px solid #272232' }}>
        <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-violet-400">
          Journal récent
        </h3>
        {journal.length === 0 ? (
          <p className="text-xs text-mut">Aucune entrée pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {journal.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2">
                <span className="mt-0.5 font-mono text-[9px] uppercase text-violet-400">{entry.type}</span>
                <span className="flex-1 truncate text-[11px] text-mut">{entry.content}</span>
                <span className="flex-shrink-0 font-mono text-[9px] text-line">
                  {format(entry.timestamp, "HH'h'mm", { locale: fr })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
