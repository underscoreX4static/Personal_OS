# Personal OS — Hermes

Assistant personnel agentique, PWA installable sur iPhone.

## Lancement

```bash
npm install
npm run dev
# Ouvre http://localhost:3000
```

## Build production

```bash
npm run build
npm start
```

## Installer sur iPhone

1. Ouvre l'app dans **Safari** sur iPhone
2. Bouton partage → **"Sur l'écran d'accueil"**
3. L'app s'installe en standalone, fonctionne offline

## Brancher l'API Claude

Cherche tous les `// TODO: replace with Claude API call` dans `src/lib/hermes.ts`.
Chaque fonction retourne une string — remplace le contenu par un appel `fetch` vers l'API Claude :

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': process.env.NEXT_PUBLIC_CLAUDE_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'claude-opus-4-7', max_tokens: 1024, messages: [{ role: 'user', content: text }] }),
});
const data = await response.json();
return data.content[0].text;
```

## Stack

- **Next.js 14** + TypeScript
- **Tailwind CSS v3**
- **IndexedDB** via `idb` (tout local, zéro serveur)
- **Zustand** état global
- **next-pwa** service worker + manifest

## Structure

```
src/
  app/           # Next.js App Router
  components/
    chat/        # Interface chat + MessageBubble + ChatInput
    profile/     # Second cerveau
    planning/    # Reminders + Briefings
    system/      # Agents + Journal
    ui/          # TopBar, BottomNav, OctogoneAvatar
  lib/
    db.ts        # IndexedDB helpers
    hermes.ts    # Logique Hermes (mockée, TODO Claude API)
    initialData.ts # Profil initial + Pool onboarding
  store/
    useAppStore.ts # Zustand
  types/
    index.ts     # Types TypeScript
```
