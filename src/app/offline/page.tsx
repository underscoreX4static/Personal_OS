export default function OfflinePage() {
  return (
    <div
      className="flex h-dvh flex-col items-center justify-center gap-4 px-8 text-center"
      style={{ background: 'var(--bg)', color: 'var(--ink)' }}
    >
      <div className="text-4xl">⬡</div>
      <h1 className="font-display text-2xl font-bold uppercase tracking-widest">HERMES</h1>
      <p className="text-sm text-mut">Tu es hors ligne, mais l&apos;app tourne entièrement en local — recharge la page.</p>
    </div>
  );
}
