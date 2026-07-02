import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

const HERMES_BIN = process.env.HERMES_BIN || '/app/.hermes/bin/hermes';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const HOME_DIR = process.env.HOME || '/app/.hermes/hermes-agent';

interface ToolEvent {
  type: 'tool' | 'thinking' | 'result' | 'error';
  tool?: string;
  message?: string;
  timestamp: number;
}

function parseHermesOutput(line: string): ToolEvent | null {
  const timestamp = Date.now();
  const lowerLine = line.toLowerCase();

  // Hermes verbose output patterns:
  // "[Tool] terminal: <command>"
  // "Tool: terminal"
  // "Using terminal..."
  // "Calling <tool_name>..."
  // "Running: <command>"
  // etc.

  // Tool name extraction patterns
  if (line.includes('[Tool]') || line.includes('Tool:')) {
    if (lowerLine.includes('terminal') || lowerLine.includes('bash')) {
      return { type: 'tool', tool: 'terminal', message: line.trim(), timestamp };
    }
    if (lowerLine.includes('browser') || lowerLine.includes('web')) {
      return { type: 'tool', tool: 'browser', message: line.trim(), timestamp };
    }
    if (lowerLine.includes('file') || lowerLine.includes('read') || lowerLine.includes('write')) {
      return { type: 'tool', tool: 'file', message: line.trim(), timestamp };
    }
    if (lowerLine.includes('memory') || lowerLine.includes('store') || lowerLine.includes('recall')) {
      return { type: 'tool', tool: 'memory', message: line.trim(), timestamp };
    }
    if (lowerLine.includes('code') || lowerLine.includes('execute') || lowerLine.includes('python') || lowerLine.includes('node')) {
      return { type: 'tool', tool: 'code', message: line.trim(), timestamp };
    }
    return { type: 'tool', tool: 'unknown', message: line.trim(), timestamp };
  }

  // Action patterns (more permissive)
  if (lowerLine.includes('running:') || lowerLine.includes('executing:') || lowerLine.includes('command:')) {
    return { type: 'tool', tool: 'terminal', message: line.trim(), timestamp };
  }

  if (lowerLine.includes('searching') || lowerLine.includes('browsing') || lowerLine.includes('fetching')) {
    return { type: 'tool', tool: 'browser', message: line.trim(), timestamp };
  }

  if (lowerLine.includes('reading file') || lowerLine.includes('writing file') || lowerLine.includes('opening')) {
    return { type: 'tool', tool: 'file', message: line.trim(), timestamp };
  }

  if (lowerLine.includes('remembering') || lowerLine.includes('storing') || lowerLine.includes('recalling')) {
    return { type: 'tool', tool: 'memory', message: line.trim(), timestamp };
  }

  // Thinking indicators
  if (lowerLine.includes('thinking') || lowerLine.includes('reasoning') || lowerLine.includes('analyzing') || lowerLine.includes('processing')) {
    return { type: 'thinking', message: line.trim(), timestamp };
  }

  // Generic "Using X" or "Calling X" patterns
  const usingMatch = line.match(/using\s+(\w+)/i);
  const callingMatch = line.match(/calling\s+(\w+)/i);

  if (usingMatch || callingMatch) {
    const toolName = (usingMatch || callingMatch)?.[1]?.toLowerCase();
    if (toolName) {
      const toolMap: Record<string, string> = {
        'terminal': 'terminal',
        'bash': 'terminal',
        'shell': 'terminal',
        'browser': 'browser',
        'web': 'browser',
        'file': 'file',
        'memory': 'memory',
        'code': 'code',
        'python': 'code',
        'node': 'code',
      };
      return { type: 'tool', tool: toolMap[toolName] || 'unknown', message: line.trim(), timestamp };
    }
  }

  // Progress indicators (keep showing activity)
  if (line.includes('...') || line.includes('→') || line.includes('•')) {
    return { type: 'thinking', message: line.trim(), timestamp };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  if (!message) {
    return new Response('Missing message', { status: 400 });
  }

  // Create a Server-Sent Events stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const args = ['chat', '-q', message];

      const proc = spawn(HERMES_BIN, args, {
        env: {
          ...process.env,
          ANTHROPIC_API_KEY,
          HOME: HOME_DIR,
          PATH: `${HOME_DIR}/.local/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
        },
      });

      let fullOutput = '';
      let errorOutput = '';

      // Helper to send SSE event
      const sendEvent = (event: ToolEvent) => {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // Parse stdout for final response
      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        fullOutput += text;
        console.log('[SSE] Hermes stdout:', text);
      });

      // Parse stderr for tool progress events (Hermes outputs tool info to stderr)
      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        errorOutput += text;

        // Split by lines and parse each for tool events
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            console.log('[SSE] Hermes stderr:', line);
            const event = parseHermesOutput(line);
            if (event) {
              sendEvent(event);
            }
          }
        }
      });

      proc.on('close', (code) => {
        console.log('[SSE] Hermes process closed, code:', code);

        if (code === 0 && fullOutput.trim()) {
          // Send final result
          sendEvent({
            type: 'result',
            message: fullOutput.trim(),
            timestamp: Date.now(),
          });
        } else {
          // Send error
          sendEvent({
            type: 'error',
            message: errorOutput || 'Hermes process failed',
            timestamp: Date.now(),
          });
        }

        controller.close();
      });

      proc.on('error', (error) => {
        console.error('[SSE] Process error:', error);
        sendEvent({
          type: 'error',
          message: error.message,
          timestamp: Date.now(),
        });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
