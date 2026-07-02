'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToolEvent {
  type: 'tool' | 'thinking' | 'result' | 'error';
  tool?: string;
  message?: string;
  timestamp: number;
}

interface ToolProgressProps {
  onComplete: (result: string) => void;
  onError: (error: string) => void;
}

const TOOL_ICONS: Record<string, string> = {
  terminal: '💻',
  browser: '🌐',
  file: '📁',
  memory: '🧠',
  code: '⚡',
  unknown: '🔧',
};

const TOOL_LABELS: Record<string, string> = {
  terminal: 'Terminal',
  browser: 'Web',
  file: 'Fichiers',
  memory: 'Mémoire',
  code: 'Code',
  unknown: 'Outil',
};

export function ToolProgress({ onComplete, onError }: ToolProgressProps) {
  const [events, setEvents] = useState<ToolEvent[]>([]);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Update current tool when new tool event arrives
    const lastToolEvent = events.filter(e => e.type === 'tool').pop();
    if (lastToolEvent?.tool) {
      setCurrentTool(lastToolEvent.tool);
    }
  }, [events]);

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-6 w-full max-w-sm rounded-2xl bg-gray-900 p-6 shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl animate-pulse">🤖</div>
          <h3 className="text-lg font-semibold text-white">Hermes travaille...</h3>
        </div>

        {/* Current tool */}
        {currentTool && (
          <div className="mb-6 flex items-center justify-center gap-3 rounded-xl bg-violet-900/30 p-4 border border-violet-700/50">
            <span className="text-3xl">{TOOL_ICONS[currentTool] || '🔧'}</span>
            <div>
              <div className="text-sm text-gray-400">Utilise</div>
              <div className="font-semibold text-white">{TOOL_LABELS[currentTool] || 'Outil'}</div>
            </div>
          </div>
        )}

        {/* Event timeline */}
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-black/40 p-4">
          {events.length === 0 && (
            <div className="text-center text-sm text-gray-500">Initialisation...</div>
          )}
          {events.map((event, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-sm ${
                event.type === 'error' ? 'text-red-400' : 'text-gray-300'
              }`}
            >
              <span className="flex-shrink-0">
                {event.type === 'tool' && (TOOL_ICONS[event.tool || 'unknown'] || '🔧')}
                {event.type === 'thinking' && '💭'}
                {event.type === 'error' && '❌'}
              </span>
              <span className="flex-1 leading-relaxed">{event.message}</span>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="mt-4 flex justify-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-violet-500" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-violet-500" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-violet-500" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export function useToolProgress(message: string) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [events, setEvents] = useState<ToolEvent[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startProcessing = async () => {
    setIsProcessing(true);
    setEvents([]);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('SSE connection failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const event: ToolEvent = JSON.parse(data);

              if (event.type === 'result') {
                setResult(event.message || '');
                setIsProcessing(false);
                return event.message || '';
              } else if (event.type === 'error') {
                setError(event.message || 'Unknown error');
                setIsProcessing(false);
                throw new Error(event.message);
              } else {
                setEvents(prev => [...prev, event]);
              }
            } catch (e) {
              console.error('[ToolProgress] Failed to parse SSE event:', e);
            }
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setIsProcessing(false);
      throw err;
    }
  };

  return {
    isProcessing,
    events,
    result,
    error,
    startProcessing,
  };
}
