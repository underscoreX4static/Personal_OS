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

  // Detect tool usage patterns in Hermes output
  // Examples from Hermes CLI:
  // "Using tool: bash"
  // "Running command: ls"
  // "Reading file: /path/to/file"
  // "Searching web for: query"
  // "Writing to memory: key"

  // Terminal/Bash tool
  if (line.includes('Running command:') || line.includes('bash')) {
    return { type: 'tool', tool: 'terminal', message: line.trim(), timestamp };
  }

  // Browser/Web tool
  if (line.includes('Searching') || line.includes('browser') || line.includes('web')) {
    return { type: 'tool', tool: 'browser', message: line.trim(), timestamp };
  }

  // File operations
  if (line.includes('Reading file:') || line.includes('Writing file:') || line.includes('file')) {
    return { type: 'tool', tool: 'file', message: line.trim(), timestamp };
  }

  // Memory operations
  if (line.includes('memory') || line.includes('Storing') || line.includes('Recalling')) {
    return { type: 'tool', tool: 'memory', message: line.trim(), timestamp };
  }

  // Code execution
  if (line.includes('Executing') || line.includes('python') || line.includes('node')) {
    return { type: 'tool', tool: 'code', message: line.trim(), timestamp };
  }

  // Thinking/reasoning
  if (line.includes('thinking') || line.includes('reasoning') || line.includes('analyzing')) {
    return { type: 'thinking', message: line.trim(), timestamp };
  }

  // Generic tool usage
  if (line.includes('Using tool:') || line.includes('Tool:')) {
    return { type: 'tool', tool: 'unknown', message: line.trim(), timestamp };
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

      // Parse stdout line by line for tool events
      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        fullOutput += text;

        // Split by lines and parse each
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            console.log('[SSE] Hermes stdout:', line);
            const event = parseHermesOutput(line);
            if (event) {
              sendEvent(event);
            }
          }
        }
      });

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        errorOutput += text;
        console.error('[SSE] Hermes stderr:', text);
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
