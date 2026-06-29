'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getReminders, deleteReminder } from '@/lib/db';
import { generateMorningBriefing, generateEveningRecap } from '@/lib/hermes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function PlanningTab() {
  const { reminders, setReminders, removeReminder } = useAppStore();
  const [briefing, setBriefing] = useState('');
  const [showBriefing, setShowBriefing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await getReminders();
      setReminders(r);
      setLoading(false);
    })();
  }, [setReminders]);

  const handleDelete = async (id: string) => {
    await deleteReminder(id);
    removeReminder(id);
  };

  const handleMorningBriefing = async () => {
    const text = await generateMorningBriefing();
    setBriefing(text);
    setShowBriefing(true);
  };

  const handleEveningRecap = async () => {
    const text = await generateEveningRecap();
    setBriefing(text);
    setShowBriefing(true);
  };

  const active = reminders.filter((r) => !r.triggered);

  if (loading) return <div className="flex h-full items-center justify-center text-mut">Chargement…</div>;

  return (
    <div className="overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      {/* Quick actions */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={handleMorningBriefing}
          className="flex-1 rounded-xl py-2.5 text-xs font-medium text-white transition-opacity active:opacity-70"
          style={{ background: 'linear-gradient(135deg, #6D28D9, #C026D3)' }}
        >
          ☀️ Morning Briefing
        </button>
        <button
          onClick={handleEveningRecap}
          className="flex-1 rounded-xl py-2.5 text-xs font-medium text-white transition-opacity active:opacity-70"
          style={{ background: 'linear-gradient(135deg, #C026D3, #FF3D7F)' }}
        >
          🌙 Evening Recap
        </button>
      </div>

      {/* Briefing panel */}
      {showBriefing && (
        <div className="mb-4 rounded-2xl bg-card p-4" style={{ border: '1px solid #272232' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-display text-xs font-bold uppercase tracking-widest text-violet-400">Briefing</span>
            <button onClick={() => setShowBriefing(false)} className="text-mut">✕</button>
          </div>
          <p
            className="whitespace-pre-line text-sm text-ink"
            dangerouslySetInnerHTML={{ __html: briefing.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/_(.+?)_/g, '<em>$1</em>') }}
          />
        </div>
      )}

      {/* Reminders */}
      <div className="rounded-2xl bg-card p-4" style={{ border: '1px solid #272232' }}>
        <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-violet-400">
          Reminders ({active.length})
        </h3>
        {active.length === 0 ? (
          <p className="text-sm text-mut">Aucun reminder actif. Dis à Hermes ce que tu veux te rappeler !</p>
        ) : (
          <div className="space-y-2">
            {active.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-2 rounded-xl bg-bg2 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{r.content}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-mut">
                    {format(r.due_at, "d MMM 'à' HH'h'mm", { locale: fr })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="flex-shrink-0 rounded-full p-1 text-mut transition-colors active:text-pink-400"
                  aria-label="Supprimer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
