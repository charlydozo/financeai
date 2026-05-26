import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const portfolioRouter = createTRPCRouter({
  getAll: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.portfolio.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        _count: { select: { trades: true, orders: true } },
        trades: { orderBy: { executedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const portfolio = await ctx.prisma.portfolio.findUnique({
        where: { id: input.id },
        include: {
          trades: { orderBy: { executedAt: 'desc' } },
          orders: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!portfolio || portfolio.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return portfolio;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.portfolio.create({
        data: { ...input, userId: ctx.session.user.id },
      }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.prisma.portfolio.findUnique({ where: { id } });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return ctx.prisma.portfolio.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.portfolio.findUnique({ where: { id: input.id } });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return ctx.prisma.portfolio.delete({ where: { id: input.id } });
    }),
});
