import { type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createFinanceAgent } from '@/lib/agent/graph';

export const runtime = 'nodejs';
export const maxDuration = 120;

function sse(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { plan: true },
  });
  if (sub?.plan !== 'PRO') {
    return new Response('PRO subscription required', { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const messages: { role: 'user' | 'assistant'; content: string }[] = body.messages ?? [];

  if (!messages.length || messages.at(-1)?.role !== 'user') {
    return new Response('Invalid messages', { status: 400 });
  }

  const langchainMessages = messages.map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
  );

  const agent = createFinanceAgent(session.user.id);

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: object) => new TextEncoder().encode(sse(data));

      try {
        const eventStream = agent.streamEvents(
          { messages: langchainMessages },
          { version: 'v2' },
        );

        for await (const event of eventStream) {
          if (event.event === 'on_chat_model_stream') {
            const chunk = event.data?.chunk;
            const content = chunk?.content;
            if (typeof content === 'string' && content) {
              controller.enqueue(encode({ type: 'token', content }));
            } else if (Array.isArray(content)) {
              for (const block of content) {
                if (block?.type === 'text' && block.text) {
                  controller.enqueue(encode({ type: 'token', content: block.text }));
                }
              }
            }
          } else if (event.event === 'on_tool_start') {
            controller.enqueue(
              encode({
                type: 'tool_start',
                name: event.name,
                input: event.data?.input ?? {},
              }),
            );
          } else if (event.event === 'on_tool_end') {
            controller.enqueue(encode({ type: 'tool_end', name: event.name }));
          }
        }

        controller.enqueue(encode({ type: 'done' }));
      } catch (err: any) {
        controller.enqueue(encode({ type: 'error', message: err?.message ?? 'Erreur interne' }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
