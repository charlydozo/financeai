import { type inferAsyncReturnType } from '@trpc/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function createTRPCContext(opts: { req: Request; resHeaders?: Headers }) {
  const session = await getServerSession(authOptions);
  return { prisma, session, req: opts.req };
}

export type Context = inferAsyncReturnType<typeof createTRPCContext>;
