'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store/useAppStore';
import { getMessages, addMessage, getHermesSession } from '@/lib/db';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { VoiceInput } from './VoiceInput';
import type { Message } from '@/types';

interface ToolEvent {
  type: 'tool' | 'thinking' | 'result' | 'error';
  tool?: string;
  message?: string;
  timestamp: number;
}

async function callHermesAPIWithStream(text: string, onEvent: (event: ToolEvent) => void): Promise<string> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  });

  if (!response.ok) {
    throw new Error('Hermes API error');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No reader available');
  }

  let finalResult = '';

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
          onEvent(event);

          if (event.type === 'result') {
            finalResult = event.message || '';
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Unknown error');
          }
        } catch (e) {
          console.error('[ChatTab] Failed to parse SSE event:', e);
        }
      }
    }
  }

  if (!finalResult) {
    throw new Error('No result from Hermes');
  }

  return finalResult;
}

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'hermes',
  content: `Salut. Je suis Hermes, ton Personal OS.\n\nJe tourne 24/7 sur Railway et je garde la mémoire de toutes nos conversations. Je peux t'aider avec :\n\n• Planning & reminders\n• Prendre des décisions\n• Apprendre à te connaître (profil)\n• Gérer tes projets\n• Tenir un journal\n\nTu veux qu'on commence par quoi ?`,
  timestamp: Date.now(),
  quickReplies: ["Pose-moi une question", "J'ai quelque chose à gérer"],
};

export function ChatTab() {
  const { messages, setMessages, addMessage: storeAddMessage, isHermesTyping, setHermesTyping } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showToolProgress, setShowToolProgress] = useState(false);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const stored = await getMessages();
      if (stored.length === 0) {
        await addMessage(WELCOME_MESSAGE);
        setMessages([WELCOME_MESSAGE]);
      } else {
        setMessages(stored);
      }
    })();
  }, [setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isHermesTyping]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: nanoid(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    await addMessage(userMsg);
    storeAddMessage(userMsg);
    setHermesTyping(true);
    setShowToolProgress(true);
    setToolEvents([]);

    try {
      const content = await callHermesAPIWithStream(text, (event) => {
        setToolEvents(prev => [...prev, event]);
      });

      setShowToolProgress(false);

      const hermesMsg: Message = {
        id: nanoid(),
        role: 'hermes',
        content,
        timestamp: Date.now(),
      };
      await addMessage(hermesMsg);
      storeAddMessage(hermesMsg);
    } catch (error) {
      setShowToolProgress(false);

      const errorMsg: Message = {
        id: nanoid(),
        role: 'hermes',
        content: `Désolé, je n'arrive pas à me connecter au serveur Hermes en ce moment. Vérifie ta connexion internet et réessaie.\n\nErreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: Date.now(),
      };
      await addMessage(errorMsg);
      storeAddMessage(errorMsg);
    } finally {
      setHermesTyping(false);
    }
  }, [storeAddMessage, setHermesTyping]);

  const handleQuickReply = useCallback((reply: string) => {
    sendMessage(reply);
  }, [sendMessage]);

  const handleVoiceStart = useCallback(() => {
    setShowVoiceInput(true);
  }, []);

  const handleVoiceCancel = useCallback(() => {
    setShowVoiceInput(false);
  }, []);

  const handleVoiceSend = useCallback((text: string) => {
    setShowVoiceInput(false);
    sendMessage(text);
  }, [sendMessage]);

  if (showVoiceInput) {
    return <VoiceInput onSend={handleVoiceSend} onCancel={handleVoiceCancel} />;
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <div
          className="flex-1 overflow-y-auto py-3"
          style={{ WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}
        >
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble message={msg} />
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-1 pt-2">
                  {msg.quickReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => handleQuickReply(reply)}
                      className="rounded-full border border-violet-600 px-3 py-1.5 text-xs text-violet-400 transition-all active:bg-violet-900/40"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isHermesTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
        <ChatInput
          onSend={sendMessage}
          disabled={isHermesTyping}
          onVoiceStart={handleVoiceStart}
        />
      </div>

      {showToolProgress && (
        <ToolProgressOverlay events={toolEvents} />
      )}
    </>
  );
}

interface ToolProgressOverlayProps {
  events: ToolEvent[];
}

function ToolProgressOverlay({ events }: ToolProgressOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const lastToolEvent = events.filter(e => e.type === 'tool').pop();
    if (lastToolEvent?.tool) {
      setCurrentTool(lastToolEvent.tool);
    }
  }, [events]);

  if (!mounted) return null;

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
