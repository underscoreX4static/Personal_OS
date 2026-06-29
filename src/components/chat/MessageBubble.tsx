'use client';

import { OctogoneAvatar } from '@/components/ui/OctogoneAvatar';
import type { Message } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
}

export function MessageBubble({ message }: { message: Message }) {
  const isHermes = message.role === 'hermes';
  const time = format(message.timestamp, "HH'h'mm", { locale: fr });

  if (isHermes) {
    return (
      <div className="flex items-end gap-2 px-4 py-1">
        <OctogoneAvatar size={28} />
        <div className="max-w-[78%]">
          <div
            className="rounded-2xl rounded-bl-sm bg-card px-4 py-3 text-ink"
            style={{ border: '1px solid #272232' }}
          >
            <p
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          </div>
          <p className="mt-1 pl-1 font-mono text-[10px] text-mut">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-end gap-2 px-4 py-1">
      <div className="max-w-[78%]">
        <div
          className="rounded-2xl rounded-br-sm px-4 py-3 text-white"
          style={{ background: 'linear-gradient(135deg, #6D28D9, #C026D3, #FF3D7F)' }}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        <p className="mt-1 pr-1 text-right font-mono text-[10px] text-mut">{time}</p>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4 py-1">
      <OctogoneAvatar size={28} />
      <div
        className="rounded-2xl rounded-bl-sm bg-card px-4 py-3"
        style={{ border: '1px solid #272232' }}
      >
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-mut"
              style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
