import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { type Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Procédure publique — pas d'authentification requise
export const publicProcedure = t.procedure;

// Procédure protégée — utilisateur connecté obligatoire
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Connexion requise' });
  }
  return next({ ctx: { session: { ...ctx.session, user: ctx.session.user } } });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

// Procédure PRO — plan PRO vérifié en base à chaque appel
const enforcePro = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Connexion requise' });
  }

  const subscription = await ctx.prisma.subscription.findUnique({
    where: { userId: ctx.session.user.id },
    select: { plan: true },
  });

  if (!subscription || subscription.plan !== 'PRO') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Cette fonctionnalité est réservée aux abonnés PRO',
    });
  }

  return next({ ctx: { session: { ...ctx.session, user: ctx.session.user } } });
});

export const proProcedure = t.procedure.use(enforcePro);
