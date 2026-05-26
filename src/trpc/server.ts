import 'server-only';
import { createCallerFactory } from '@/server/trpc';
import { appRouter } from '@/server/routers/_app';
import { createTRPCContext } from '@/server/context';

const createCaller = createCallerFactory(appRouter);

export async function createServerApi() {
  const ctx = await createTRPCContext({ req: new Request('http://internal') });
  return createCaller(ctx);
}
