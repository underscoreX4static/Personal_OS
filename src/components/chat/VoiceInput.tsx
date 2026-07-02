'use client';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useState, useEffect } from 'react';

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

  // Auto-start recording when component mounts
  useEffect(() => {
    startRecording();
  }, [startRecording]);

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

  // Idle/Loading state - show loading while initializing
  if (state === 'idle') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎤</div>
          <p className="text-gray-400">Initialisation du micro...</p>
        </div>
      </div>
    );
  }

  // Recording or Paused state
  if (state === 'recording' || state === 'paused') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900">
        {/* Header */}
        <div className={`px-4 py-3 ${state === 'recording' ? 'bg-red-600' : 'bg-orange-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {state === 'recording' ? (
                <>
                  <div className="h-3 w-3 animate-pulse rounded-full bg-white" />
                  <span className="text-sm font-medium text-white">Enregistrement</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full bg-white" />
                  <span className="text-sm font-medium text-white">En pause</span>
                </>
              )}
            </div>
            <span className="text-sm font-mono text-white">{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Waveform */}
        <div className="flex h-24 items-center justify-center gap-1 bg-slate-800 px-4">
          {Array.from({ length: 40 }).map((_, i) => {
            const height = state === 'recording'
              ? Math.random() * audioLevel * 60 + 10
              : 10;
            return (
              <div
                key={i}
                className="w-1 rounded-full bg-violet-500 transition-all duration-100"
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* Transcript preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-300 whitespace-pre-wrap">
            {transcript || 'Parle maintenant...'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 border-t border-slate-700 bg-slate-800 p-4">
          <button
            onClick={handleCancel}
            className="flex-1 rounded-lg bg-slate-700 py-3 text-sm font-medium text-white active:bg-slate-600"
          >
            Annuler
          </button>

          {state === 'recording' ? (
            <button
              onClick={pauseRecording}
              className="flex-1 rounded-lg bg-orange-600 py-3 text-sm font-medium text-white active:bg-orange-700"
            >
              ⏸ Pause
            </button>
          ) : (
            <button
              onClick={resumeRecording}
              className="flex-1 rounded-lg bg-green-600 py-3 text-sm font-medium text-white active:bg-green-700"
            >
              ▶️ Reprendre
            </button>
          )}

          <button
            onClick={handleStop}
            className="flex-1 rounded-lg bg-violet-600 py-3 text-sm font-medium text-white active:bg-violet-700"
          >
            ⏹ Stop
          </button>
        </div>
      </div>
    );
  }

  // Preview state
  if (state === 'preview') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900">
        {/* Header */}
        <div className="border-b border-slate-700 bg-slate-800 px-4 py-3">
          <h3 className="text-sm font-medium text-white">Transcription</h3>
        </div>

        {/* Editable transcript */}
        <div className="flex-1 overflow-y-auto p-4">
          <textarea
            value={editedText || transcript}
            onChange={(e) => setEditedText(e.target.value)}
            className="h-full w-full resize-none bg-transparent text-gray-300 outline-none"
            placeholder="Ton message..."
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-700 bg-slate-800 p-4">
          <button
            onClick={handleCancel}
            className="rounded-lg bg-slate-700 px-4 py-3 text-sm font-medium text-white active:bg-slate-600"
          >
            Annuler
          </button>

          <button
            onClick={handleAddMore}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-medium text-white active:bg-orange-700"
          >
            🎤 Ajouter
          </button>

          <button
            onClick={handleSend}
            className="flex-1 rounded-lg bg-violet-600 py-3 text-sm font-medium text-white active:bg-violet-700"
          >
            📤 Envoyer
          </button>
        </div>
      </div>
    );
  }

  return null;
}
