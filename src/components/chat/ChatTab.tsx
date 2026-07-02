'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getMessages, addMessage } from '@/lib/db';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { VoiceInput } from './VoiceInput';
import { useBackgroundJob } from '@/hooks/useBackgroundJob';
import type { Message } from '@/types';

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

  // Background job hook
  const { startJob } = useBackgroundJob((result) => {
    // Callback when job completes
    const hermesMsg: Message = {
      id: nanoid(),
      role: 'hermes',
      content: result,
      timestamp: Date.now(),
    };
    addMessage(hermesMsg).then(() => {
      storeAddMessage(hermesMsg);
      setHermesTyping(false);
    });
  });

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
      // Start background job (non-blocking)
      await startJob(text);
      // Job started successfully
      // User will get notification immediately: "Personal OS travaille..."
      // Then another notification when Hermes responds
      // The callback above will handle adding the response to messages
    } catch (error) {
      setHermesTyping(false);
      const errorMsg: Message = {
        id: nanoid(),
        role: 'hermes',
        content: `Désolé, je n'arrive pas à lancer Hermes. Vérifie ta connexion internet et réessaie.\n\nErreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: Date.now(),
      };
      await addMessage(errorMsg);
      storeAddMessage(errorMsg);
    }
  }, [storeAddMessage, setHermesTyping, startJob]);

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
  );
}
