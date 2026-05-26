import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const alertRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.alert.findMany({
      where: { userId: ctx.session.user.id, active: true },
      orderBy: { createdAt: 'desc' },
    }),
  ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.alert.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { active: false },
      }),
    ),
});
