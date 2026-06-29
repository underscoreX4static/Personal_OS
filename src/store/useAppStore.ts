import { create } from 'zustand';
import type { Message, Reminder, OnboardingQuestion, Profile, Project } from '@/types';

export type TabId = 'chat' | 'profile' | 'planning' | 'system';
export type Theme = 'dark' | 'light';

interface AppState {
  activeTab: TabId;
  theme: Theme;
  messages: Message[];
  reminders: Reminder[];
  onboardingPool: OnboardingQuestion[];
  profile: Profile | null;
  projects: Project[];
  isHermesTyping: boolean;

  setActiveTab: (tab: TabId) => void;
  setTheme: (theme: Theme) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  setReminders: (r: Reminder[]) => void;
  addReminder: (r: Reminder) => void;
  removeReminder: (id: string) => void;
  setOnboardingPool: (pool: OnboardingQuestion[]) => void;
  markQuestionDone: (id: string) => void;
  setProfile: (p: Profile) => void;
  setProjects: (p: Project[]) => void;
  setHermesTyping: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'chat',
  theme: 'dark',
  messages: [],
  reminders: [],
  onboardingPool: [],
  profile: null,
  projects: [],
  isHermesTyping: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setTheme: (theme) => set({ theme }),
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setReminders: (reminders) => set({ reminders }),
  addReminder: (r) => set((s) => ({ reminders: [...s.reminders, r] })),
  removeReminder: (id) => set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),
  setOnboardingPool: (onboardingPool) => set({ onboardingPool }),
  markQuestionDone: (id) =>
    set((s) => ({
      onboardingPool: s.onboardingPool.map((q) =>
        q.id === id ? { ...q, done: true, answered_at: Date.now() } : q
      ),
    })),
  setProfile: (profile) => set({ profile }),
  setProjects: (projects) => set({ projects }),
  setHermesTyping: (isHermesTyping) => set({ isHermesTyping }),
}));
