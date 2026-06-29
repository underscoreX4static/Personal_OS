export type MessageRole = 'user' | 'hermes';
export type MessageIntent =
  | 'reminder'
  | 'onboarding'
  | 'planning'
  | 'decision'
  | 'project_update'
  | 'system_command'
  | 'general';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  intent_detected?: MessageIntent;
  quickReplies?: string[];
}

export interface Reminder {
  id: string;
  content: string;
  due_at: number;
  created_at: number;
  triggered: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'done';
  last_mentioned: number;
  notes: string;
}

export interface JournalEntry {
  id: string;
  type: string;
  content: string;
  timestamp: number;
}

export interface OnboardingQuestion {
  id: string;
  question: string;
  field: string;
  done: boolean;
  answered_at?: number;
}

export interface Profile {
  identity: {
    name: string | null;
    age: number | null;
    nationality: string | null;
    current_location: string | null;
    visa_status: string | null;
    languages: string[];
  };
  who_i_am: {
    strengths: string[];
    weaknesses: string[];
    personality_traits: string[];
    how_i_work_best: string | null;
    what_drains_me: string | null;
    what_energizes_me: string | null;
  };
  values: {
    core_values: string[];
    non_negotiables: string[];
    what_success_means_to_me: string | null;
  };
  objectives: {
    short_term: string[];
    mid_term: string[];
    long_term: string[];
    north_star: string | null;
  };
  active_projects: Project[];
  constraints: {
    financial: string | null;
    time: string | null;
    legal: string[];
    personal: string[];
  };
  health_sport: {
    current_routine: string | null;
    goals: string[];
    blockers: string[];
  };
  decisions_log: Array<{ decision: string; date: number; outcome?: string }>;
}
