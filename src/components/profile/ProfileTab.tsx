'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getProfile, saveProfile, getOnboardingPool, markQuestionDone } from '@/lib/db';
import type { Profile } from '@/types';

function countFilledFields(profile: Profile): number {
  let count = 0;
  const check = (v: unknown) => {
    if (v === null || v === undefined) return;
    if (typeof v === 'string' && v.trim()) count++;
    if (Array.isArray(v) && v.length > 0) count++;
  };
  Object.values(profile.identity).forEach(check);
  Object.values(profile.who_i_am).forEach(check);
  Object.values(profile.values).forEach(check);
  Object.values(profile.objectives).forEach(check);
  Object.values(profile.constraints).forEach(check);
  Object.values(profile.health_sport).forEach(check);
  return count;
}

export function ProfileTab() {
  const { profile, setProfile, onboardingPool, setOnboardingPool } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => {
    (async () => {
      const [p, pool] = await Promise.all([getProfile(), getOnboardingPool()]);
      setProfile(p);
      setOnboardingPool(pool);
      setLoading(false);
    })();
  }, [setProfile, setOnboardingPool]);

  const doneCount = onboardingPool.filter((q) => q.done).length;
  const total = onboardingPool.length;
  const filledFields = profile ? countFilledFields(profile) : 0;

  const exportProfile = () => {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hermes-profile.json';
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg('Exporté ✓');
    setTimeout(() => setExportMsg(''), 2000);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-mut">Chargement…</div>;
  }

  return (
    <div className="overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      {/* Onboarding progress */}
      <div className="mb-4 rounded-2xl bg-card p-4" style={{ border: '1px solid #272232' }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-sm font-bold uppercase tracking-widest text-ink">
            Second Cerveau
          </span>
          <span className="font-mono text-xs text-mut">{doneCount}/{total}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(doneCount / total) * 100}%`,
              background: 'linear-gradient(90deg, #6D28D9, #FF3D7F)',
            }}
          />
        </div>
        <p className="mt-1 text-[11px] text-mut">{filledFields} champs renseignés</p>
      </div>

      {/* Identity section */}
      {profile && (
        <div className="space-y-3">
          <ProfileSection title="Identité" data={profile.identity} />
          <ProfileSection title="Qui je suis" data={profile.who_i_am} />
          <ProfileSection title="Valeurs" data={profile.values} />
          <ProfileSection title="Objectifs" data={profile.objectives} />
          <ProfileSection title="Contraintes" data={profile.constraints} />
          <ProfileSection title="Santé & Sport" data={profile.health_sport} />
        </div>
      )}

      {/* Export button */}
      <button
        onClick={exportProfile}
        className="mt-4 w-full rounded-2xl py-3 text-sm font-medium text-white transition-opacity active:opacity-70"
        style={{ background: 'linear-gradient(135deg, #6D28D9, #FF3D7F)' }}
      >
        {exportMsg || 'Exporter le profil JSON'}
      </button>
    </div>
  );
}

function ProfileSection({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <div className="rounded-2xl bg-card p-4" style={{ border: '1px solid #272232' }}>
      <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-violet-400">
        {title}
      </h3>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          const isEmpty = value === null || value === undefined || (Array.isArray(value) && value.length === 0) || value === '';
          const displayValue = isEmpty
            ? '—'
            : Array.isArray(value)
            ? value.join(', ')
            : String(value);
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <div key={key} className="flex items-start justify-between gap-2">
              <span className="font-mono text-[11px] text-mut">{label}</span>
              <span
                className={`max-w-[60%] text-right text-[12px] ${isEmpty ? 'text-line' : 'text-ink'}`}
              >
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
