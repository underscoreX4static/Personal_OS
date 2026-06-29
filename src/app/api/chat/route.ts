import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

const HERMES_BIN = process.env.HERMES_BIN || '/Users/certideal/.local/bin/hermes';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// TODO: replace with direct Hermes API when available
function callHermes(message: string, sessionId?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['chat', '-q', message];
    if (sessionId) args.push('--resume', sessionId);

    const proc = spawn(HERMES_BIN, args, {
      env: {
        ...process.env,
        ANTHROPIC_API_KEY,
        HOME: process.env.HOME || '/Users/certideal',
        PATH: `/Users/certideal/.local/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
      },
      timeout: 60000,
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { error += d.toString(); });

    proc.on('close', (code) => {
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

    const reply = await callHermes(message.trim(), sessionId);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Hermes API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
