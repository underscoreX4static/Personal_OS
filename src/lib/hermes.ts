import type { Message, MessageIntent, Reminder } from '@/types';
import { addReminder, getNextQuestion, getReminders, getProjects, addJournalEntry } from './db';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function nanoid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function detectIntent(text: string): MessageIntent {
  const t = text.toLowerCase();

  if (/rappelle[- ]?moi|n'oublie pas|dans \d+|demain|ce soir|ce week|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/.test(t)) return 'reminder';
  if (/pose[- ]?moi une question|question suivante|onboarding|apprendre à me connaître/.test(t)) return 'onboarding';
  if (/planning|aujourd'hui|cette semaine|qu'est[- ]ce que j'ai|mes tâches|agenda/.test(t)) return 'planning';
  if (/je ne sais pas quoi faire|j'hésite|comment choisir|décider|choix|dilemme/.test(t)) return 'decision';
  if (/j'avance sur|j'ai fait|j'ai commencé|j'ai terminé|j'ai fini|projet|update/.test(t)) return 'project_update';
  if (/morning briefing|recap du jour|statut projets|bilan|briefing|rapport/.test(t)) return 'system_command';
  return 'general';
}

function parseReminderDate(text: string): number {
  const now = Date.now();
  const t = text.toLowerCase();

  if (/demain/.test(t)) return now + 86400000;
  if (/ce soir/.test(t)) {
    const d = new Date(); d.setHours(20, 0, 0, 0);
    return d.getTime() > now ? d.getTime() : now + 3600000;
  }

  const inMatch = t.match(/dans (\d+)\s*(minute|heure|jour|semaine|mois)/);
  if (inMatch) {
    const n = parseInt(inMatch[1]);
    const units: Record<string, number> = { minute: 60000, heure: 3600000, jour: 86400000, semaine: 604800000, mois: 2592000000 };
    const unit = Object.keys(units).find(k => inMatch[2].startsWith(k)) ?? 'jour';
    return now + n * units[unit];
  }

  return now + 86400000;
}

// TODO: replace with Claude API call
async function handleReminder(text: string): Promise<{ reply: string; reminder?: Reminder }> {
  const due_at = parseReminderDate(text);
  const reminder: Reminder = {
    id: nanoid(),
    content: text,
    due_at,
    created_at: Date.now(),
    triggered: false,
    priority: 'medium',
  };
  await addReminder(reminder);
  await addJournalEntry({ id: nanoid(), type: 'reminder_created', content: text, timestamp: Date.now() });
  const dateStr = format(due_at, "d MMM 'à' HH'h'mm", { locale: fr });
  return {
    reply: `Noté ✓ Je te rappelle ça ${dateStr}.`,
    reminder,
  };
}

// TODO: replace with Claude API call
async function handleOnboarding(): Promise<string> {
  const q = await getNextQuestion();
  if (!q) return "Tu as répondu à toutes les questions de l'onboarding — ton profil est complet 🎉 Tu peux l'éditer dans l'onglet Profil.";
  await addJournalEntry({ id: nanoid(), type: 'onboarding_question_asked', content: q.id, timestamp: Date.now() });
  return `**Question onboarding** (${q.id.replace('q_', '')})\n\n${q.question}`;
}

// TODO: replace with Claude API call
async function handlePlanning(): Promise<string> {
  const reminders = await getReminders();
  const active = reminders.filter(r => !r.triggered);
  if (active.length === 0) return "Tu n'as aucun reminder actif pour l'instant. Dis-moi ce que tu veux que je note !";
  const lines = active.map(r => `• ${r.content} — ${format(r.due_at, "d MMM HH'h'mm", { locale: fr })}`);
  return `**Ton planning :**\n\n${lines.join('\n')}`;
}

// TODO: replace with Claude API call
async function handleDecision(_text: string): Promise<string> {
  return `Je t'entends. Tu es face à un choix.\n\nAvant de décider, dis-moi : **qu'est-ce qui se passe si tu ne fais rien pendant une semaine ?**\n\nParfois la meilleure décision c'est d'attendre que la situation devienne plus claire.`;
}

// TODO: replace with Claude API call
async function handleProjectUpdate(text: string): Promise<string> {
  await addJournalEntry({ id: nanoid(), type: 'project_update', content: text, timestamp: Date.now() });
  return `Enregistré dans ton journal ✓\n\nContinue comme ça — la constance, c'est ce qui fait la différence. Tu veux que je te rappelle de faire un point sur ce projet ?`;
}

// TODO: replace with Claude API call
async function handleSystemCommand(text: string): Promise<string> {
  const t = text.toLowerCase();
  const now = new Date();

  if (/morning briefing/.test(t)) {
    return generateMorningBriefing();
  }
  if (/recap|bilan/.test(t)) {
    return generateEveningRecap();
  }
  const projects = await getProjects();
  const lines = projects.length > 0
    ? projects.map(p => `• **${p.name}** — ${p.status}`).join('\n')
    : "• Aucun projet enregistré pour l'instant.";
  return `**Statut projets — ${format(now, 'd MMM', { locale: fr })}**\n\n${lines}`;
}

// TODO: replace with Claude API call
async function handleGeneral(text: string): Promise<string> {
  const summary = text.length > 60 ? text.slice(0, 57) + '...' : text;
  return `Je t'entends. Tu me parles de "${summary}".\n\nTu veux que je fasse quelque chose avec ça ? Je peux noter un reminder, ouvrir un point sur un projet, ou juste écouter.`;
}

export async function generateMorningBriefing(): Promise<string> {
  const reminders = await getReminders();
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59);
  const todayReminders = reminders.filter(r => !r.triggered && r.due_at <= todayEnd.getTime());
  const projects = await getProjects();

  const lines = [
    `**Morning Briefing — ${format(new Date(), "EEEE d MMMM", { locale: fr })}**`,
    '',
    "**Aujourd'hui :**",
    todayReminders.length > 0
      ? todayReminders.map(r => `• ${r.content}`).join('\n')
      : "• Aucun reminder prévu aujourd'hui.",
    '',
    '**Projets actifs :**',
    projects.length > 0
      ? projects.map(p => `• ${p.name}`).join('\n')
      : '• Aucun projet actif.',
    '',
    '_Bonne journée. Focus et avance._',
  ];
  return lines.join('\n');
}

export async function generateEveningRecap(): Promise<string> {
  const reminders = await getReminders();
  const triggered = reminders.filter(r => r.triggered);

  return [
    `**Evening Recap — ${format(new Date(), "d MMM", { locale: fr })}**`,
    '',
    `• Reminders complétés aujourd'hui : ${triggered.length}`,
    '• Journal mis à jour ✓',
    '',
    '_Repose-toi. Demain tu continues._',
  ].join('\n');
}

export async function processMessage(text: string): Promise<Omit<Message, 'id' | 'timestamp'>> {
  const intent = detectIntent(text);
  let content = '';

  switch (intent) {
    case 'reminder':
      const { reply } = await handleReminder(text);
      content = reply;
      break;
    case 'onboarding':
      content = await handleOnboarding();
      break;
    case 'planning':
      content = await handlePlanning();
      break;
    case 'decision':
      content = await handleDecision(text);
      break;
    case 'project_update':
      content = await handleProjectUpdate(text);
      break;
    case 'system_command':
      content = await handleSystemCommand(text);
      break;
    default:
      content = await handleGeneral(text);
  }

  return { role: 'hermes', content, intent_detected: intent };
}
