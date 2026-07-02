import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Message, Reminder, Project, JournalEntry, OnboardingQuestion, Profile } from '@/types';
import type { Job } from '@/types/jobs';
import { INITIAL_PROFILE, ONBOARDING_POOL } from './initialData';

interface PersonalOSDB extends DBSchema {
  conversations: {
    key: string;
    value: Message;
    indexes: { 'by-timestamp': number };
  };
  profile: {
    key: string;
    value: { id: string; data: Profile };
  };
  onboarding_pool: {
    key: string;
    value: OnboardingQuestion;
  };
  reminders: {
    key: string;
    value: Reminder;
    indexes: { 'by-due': number };
  };
  projects: {
    key: string;
    value: Project;
  };
  journal: {
    key: string;
    value: JournalEntry;
    indexes: { 'by-timestamp': number };
  };
  hermes_session: {
    key: string;
    value: { id: string; sessionId: string; lastUsed: number };
  };
  jobs: {
    key: string;
    value: Job;
    indexes: { 'by-created': number };
  };
}

let dbInstance: IDBPDatabase<PersonalOSDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<PersonalOSDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PersonalOSDB>('personal-os', 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
        convStore.createIndex('by-timestamp', 'timestamp');

        db.createObjectStore('profile', { keyPath: 'id' });
        db.createObjectStore('onboarding_pool', { keyPath: 'id' });

        const remStore = db.createObjectStore('reminders', { keyPath: 'id' });
        remStore.createIndex('by-due', 'due_at');

        db.createObjectStore('projects', { keyPath: 'id' });

        const journalStore = db.createObjectStore('journal', { keyPath: 'id' });
        journalStore.createIndex('by-timestamp', 'timestamp');
      }

      if (oldVersion < 2) {
        db.createObjectStore('hermes_session', { keyPath: 'id' });
      }

      if (oldVersion < 3) {
        const jobsStore = db.createObjectStore('jobs', { keyPath: 'id' });
        jobsStore.createIndex('by-created', 'createdAt');
      }
    },
  });

  await initializeData(dbInstance);
  return dbInstance;
}

async function initializeData(db: IDBPDatabase<PersonalOSDB>) {
  const profile = await db.get('profile', 'main');
  if (!profile) {
    await db.put('profile', { id: 'main', data: INITIAL_PROFILE });
  }

  const poolCount = await db.count('onboarding_pool');
  if (poolCount === 0) {
    const tx = db.transaction('onboarding_pool', 'readwrite');
    await Promise.all(ONBOARDING_POOL.map((q) => tx.store.put(q)));
    await tx.done;
  }
}

// --- Conversations ---
export async function getMessages(): Promise<Message[]> {
  const db = await getDB();
  return db.getAllFromIndex('conversations', 'by-timestamp');
}

export async function addMessage(msg: Message): Promise<void> {
  const db = await getDB();
  await db.put('conversations', msg);
}

// --- Profile ---
export async function getProfile(): Promise<Profile> {
  const db = await getDB();
  const rec = await db.get('profile', 'main');
  return rec?.data ?? INITIAL_PROFILE;
}

export async function saveProfile(data: Profile): Promise<void> {
  const db = await getDB();
  await db.put('profile', { id: 'main', data });
}

// --- Onboarding pool ---
export async function getOnboardingPool(): Promise<OnboardingQuestion[]> {
  const db = await getDB();
  return db.getAll('onboarding_pool');
}

export async function markQuestionDone(id: string): Promise<void> {
  const db = await getDB();
  const q = await db.get('onboarding_pool', id);
  if (q) {
    await db.put('onboarding_pool', { ...q, done: true, answered_at: Date.now() });
  }
}

export async function getNextQuestion(): Promise<OnboardingQuestion | null> {
  const pool = await getOnboardingPool();
  return pool.find((q) => !q.done) ?? null;
}

// --- Reminders ---
export async function getReminders(): Promise<Reminder[]> {
  const db = await getDB();
  return db.getAllFromIndex('reminders', 'by-due');
}

export async function addReminder(r: Reminder): Promise<void> {
  const db = await getDB();
  await db.put('reminders', r);
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('reminders', id);
}

export async function markReminderTriggered(id: string): Promise<void> {
  const db = await getDB();
  const r = await db.get('reminders', id);
  if (r) await db.put('reminders', { ...r, triggered: true });
}

// --- Projects ---
export async function getProjects(): Promise<Project[]> {
  const db = await getDB();
  return db.getAll('projects');
}

export async function saveProject(p: Project): Promise<void> {
  const db = await getDB();
  await db.put('projects', p);
}

// --- Journal ---
export async function getJournal(): Promise<JournalEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('journal', 'by-timestamp');
}

export async function addJournalEntry(entry: JournalEntry): Promise<void> {
  const db = await getDB();
  await db.put('journal', entry);
}

// --- Hermes Session ---
export async function getHermesSession(): Promise<string> {
  const db = await getDB();
  const session = await db.get('hermes_session', 'main');

  if (session) {
    // Update lastUsed timestamp
    await db.put('hermes_session', {
      ...session,
      lastUsed: Date.now(),
    });
    return session.sessionId;
  }

  // Create new session with a unique ID
  const newSessionId = `hermes-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.put('hermes_session', {
    id: 'main',
    sessionId: newSessionId,
    lastUsed: Date.now(),
  });
  return newSessionId;
}

export async function resetHermesSession(): Promise<void> {
  const db = await getDB();
  await db.delete('hermes_session', 'main');
}

// --- Jobs ---
export async function saveJob(job: Job): Promise<void> {
  const db = await getDB();
  await db.put('jobs', job);
}

export async function getJobFromDB(jobId: string): Promise<Job | undefined> {
  const db = await getDB();
  return db.get('jobs', jobId);
}

export async function getAllJobs(): Promise<Job[]> {
  const db = await getDB();
  return db.getAllFromIndex('jobs', 'by-created');
}

export async function deleteJob(jobId: string): Promise<void> {
  const db = await getDB();
  await db.delete('jobs', jobId);
}
