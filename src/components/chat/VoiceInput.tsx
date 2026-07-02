'use client';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface VoiceInputProps {
  onSend: (text: string) => void;
  onCancel: () => void;
}

export function VoiceInput({ onSend, onCancel }: VoiceInputProps) {
  const {
    state,
    audioLevel,
    duration,
    transcript,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    setTranscript,
  } = useVoiceRecorder();

  const [editedText, setEditedText] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      startRecording();
    }
  }, [mounted, startRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    await stopRecording();
  };

  const handleAddMore = async () => {
    setEditedText(transcript);
    await startRecording();
  };

  const handleSend = () => {
    const finalText = state === 'preview' ? (editedText || transcript) : transcript;
    if (finalText.trim()) {
      onSend(finalText);
      cancelRecording();
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  if (!mounted) return null;

  const content = (() => {
    // Loading
    if (state === 'idle') {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="mb-4 text-5xl animate-pulse">🎤</div>
            <p className="text-gray-400 text-lg">Initialisation...</p>
          </div>
        </div>
      );
    }

    // Recording or Paused
    if (state === 'recording' || state === 'paused') {
      return (
        <div className="fixed inset-0 flex flex-col bg-black">
          {/* Header status */}
          <div className={`px-6 py-4 ${state === 'recording' ? 'bg-red-600' : 'bg-orange-600'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {state === 'recording' ? (
                  <>
                    <div className="h-4 w-4 animate-pulse rounded-full bg-white" />
                    <span className="text-base font-semibold text-white">Enregistrement</span>
                  </>
                ) : (
                  <>
                    <div className="h-4 w-4 rounded-full bg-white opacity-70" />
                    <span className="text-base font-semibold text-white">En pause</span>
                  </>
                )}
              </div>
              <span className="text-base font-mono font-semibold text-white">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Waveform */}
          <div className="flex h-32 items-center justify-center gap-1 bg-gray-900 px-6">
            {Array.from({ length: 30 }).map((_, i) => {
              const height = state === 'recording'
                ? Math.random() * audioLevel * 80 + 15
                : 15;
              return (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-violet-500 transition-all duration-100"
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>

          {/* Transcript preview - scrollable area */}
          <div className="flex-1 overflow-y-auto bg-black px-6 py-6">
            <p className="text-gray-300 text-lg whitespace-pre-wrap leading-relaxed">
              {transcript || 'Parle maintenant...'}
            </p>
          </div>

          {/* Controls - AVEC PADDING BOTTOM POUR ÉVITER LA NAV */}
          <div className="bg-black px-6 pb-28 pt-6">
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-xl bg-gray-800 py-4 text-base font-semibold text-white active:bg-gray-700"
              >
                ✕ Annuler
              </button>

              {state === 'recording' ? (
                <button
                  onClick={pauseRecording}
                  className="flex-1 rounded-xl bg-orange-600 py-4 text-base font-semibold text-white active:bg-orange-700"
                >
                  ⏸ Pause
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="flex-1 rounded-xl bg-green-600 py-4 text-base font-semibold text-white active:bg-green-700"
                >
                  ▶️ Reprendre
                </button>
              )}

              <button
                onClick={handleStop}
                className="flex-1 rounded-xl bg-violet-600 py-4 text-base font-semibold text-white active:bg-violet-700"
              >
                ⏹ Stop
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Preview
    if (state === 'preview') {
      return (
        <div className="fixed inset-0 flex flex-col bg-black">
          {/* Header */}
          <div className="border-b border-gray-800 bg-gray-900 px-6 py-4">
            <h3 className="text-base font-semibold text-white">Transcription</h3>
          </div>

          {/* Editable text area */}
          <div className="flex-1 overflow-y-auto bg-black px-6 py-6">
            <textarea
              value={editedText || transcript}
              onChange={(e) => setEditedText(e.target.value)}
              className="h-full w-full resize-none bg-transparent text-lg text-gray-300 outline-none leading-relaxed"
              placeholder="Ton message..."
              autoFocus
            />
          </div>

          {/* Actions - AVEC PADDING BOTTOM */}
          <div className="bg-black px-6 pb-28 pt-6">
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="rounded-xl bg-gray-800 px-5 py-4 text-base font-semibold text-white active:bg-gray-700"
              >
                ✕ Annuler
              </button>

              <button
                onClick={handleAddMore}
                className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-4 text-base font-semibold text-white active:bg-orange-700"
              >
                🎤 Ajouter
              </button>

              <button
                onClick={handleSend}
                className="flex-1 rounded-xl bg-violet-600 py-4 text-base font-semibold text-white active:bg-violet-700"
              >
                📤 Envoyer
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  })();

  return createPortal(content, document.body);
}
