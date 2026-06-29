'use client';

import { useState, useRef, useCallback } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }, [text, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("La dictée vocale n'est pas disponible dans ce navigateur.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => prev + (prev ? ' ' : '') + transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isListening]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-bg px-3 py-2"
      style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-end gap-2">
        <button
          onClick={toggleVoice}
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all ${
            isListening
              ? 'animate-pulse bg-pink-500 text-white'
              : 'bg-card text-mut'
          }`}
          style={{ border: '1px solid #272232', minHeight: 44 }}
          aria-label="Dictée vocale"
        >
          🎤
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Dis quelque chose à Hermes..."
          rows={1}
          className="flex-1 resize-none rounded-2xl bg-card px-4 py-2.5 text-sm text-ink placeholder-mut outline-none transition-all"
          style={{
            border: '1px solid #272232',
            minHeight: 44,
            maxHeight: 120,
            WebkitOverflowScrolling: 'touch',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all active:opacity-70 disabled:opacity-30"
          style={{
            background: 'linear-gradient(135deg, #6D28D9, #C026D3, #FF3D7F)',
            minHeight: 44,
          }}
          aria-label="Envoyer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
