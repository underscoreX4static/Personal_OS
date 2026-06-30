import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

const HERMES_BIN = process.env.HERMES_BIN || '/root/.local/bin/hermes';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const HOME_DIR = process.env.HOME || '/root';

// TODO: replace with direct Hermes API when available
function callHermes(message: string, sessionId?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['chat', '-q', message];
    if (sessionId) args.push('--resume', sessionId);

    console.log('[callHermes] Spawning:', HERMES_BIN, args);

    const proc = spawn(HERMES_BIN, args, {
      env: {
        ...process.env,
        ANTHROPIC_API_KEY,
        HOME: HOME_DIR,
        PATH: `${HOME_DIR}/.local/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
      },
      timeout: 60000,
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (d) => {
      const chunk = d.toString();
      console.log('[callHermes] stdout:', chunk);
      output += chunk;
    });
    proc.stderr.on('data', (d) => {
      const chunk = d.toString();
      console.log('[callHermes] stderr:', chunk);
      error += chunk;
    });

    proc.on('close', (code) => {
      console.log('[callHermes] Process closed with code:', code);
      console.log('[callHermes] Total output:', output);
      console.log('[callHermes] Total error:', error);

      if (code !== 0 && !output) {
        reject(new Error(error || 'Hermes process failed'));
        return;
      }

      // Extract content between the box borders ╭...╰ (handles \r\n)
      const normalized = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const boxMatch = normalized.match(/╭[\s\S]*?\n([\s\S]*?)╰/);
      if (boxMatch) {
        const content = boxMatch[1]
          .split('\n')
          .map((line) => line.replace(/^\s{4}/, '').trimEnd())
          .filter((line) => line !== '')
          .join('\n')
          .trim();
        if (content) {
          resolve(content);
          return;
        }
      }

      // Fallback: return raw output minus the header/footer
      const lines = output.split('\n').filter((l) => {
        return !l.includes('Query:') &&
          !l.includes('Initializing') &&
          !l.includes('Resume this') &&
          !l.includes('Session:') &&
          !l.includes('Duration:') &&
          !l.includes('Messages:') &&
          !l.includes('────') &&
          l.trim() !== '';
      });
      resolve(lines.join('\n').trim() || 'Hermes a répondu sans contenu détectable.');
    });

    proc.on('error', reject);
  });
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 });
    }

    console.log('[API] Calling Hermes with message:', message.trim());
    console.log('[API] HERMES_BIN:', HERMES_BIN);
    console.log('[API] ANTHROPIC_API_KEY set:', !!ANTHROPIC_API_KEY);
    console.log('[API] HOME_DIR:', HOME_DIR);

    const reply = await callHermes(message.trim(), sessionId);

    console.log('[API] Hermes reply:', reply);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[API] Hermes API error:', err);
    console.error('[API] Error type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('[API] Error message:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
