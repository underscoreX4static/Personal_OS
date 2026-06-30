'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getMessages, addMessage } from '@/lib/db';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { Message } from '@/types';

async function callHermesAPI(text: string): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: text }),
  });
  if (!res.ok) throw new Error('Hermes API error');
  const data = await res.json();
  return data.reply;
}

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'hermes',
  content: `Salut. Je suis Hermes, ton assistant personnel.\n\nJe tourne entièrement sur ton téléphone pour l'instant — aucune donnée ne sort d'ici.\n\nPour commencer, je peux soit te poser des questions pour apprendre à te connaître, soit t'aider directement avec ce que t'as en tête.\n\nTu veux qu'on commence par quoi ?`,
  timestamp: Date.now(),
  quickReplies: ["Pose-moi une question", "J'ai quelque chose à gérer"],
};

export function ChatTab() {
  const { messages, setMessages, addMessage: storeAddMessage, isHermesTyping, setHermesTyping } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

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

    try {
      const content = await callHermesAPI(text);
      const hermesMsg: Message = {
        id: nanoid(),
        role: 'hermes',
        content,
        timestamp: Date.now(),
      };
      await addMessage(hermesMsg);
      storeAddMessage(hermesMsg);
    } catch (error) {
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

  return (
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
      <ChatInput onSend={sendMessage} disabled={isHermesTyping} />
    </div>
  );
}
