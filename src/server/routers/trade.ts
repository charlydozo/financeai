import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const ownsPortfolio = async (ctx: any, portfolioId: string) => {
  const portfolio = await ctx.prisma.portfolio.findUnique({ where: { id: portfolioId } });
  if (!portfolio || portfolio.userId !== ctx.session.user.id) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  return portfolio;
};

export const tradeRouter = createTRPCRouter({
  getByPortfolio: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ownsPortfolio(ctx, input.portfolioId);
      return ctx.prisma.trade.findMany({
        where: { portfolioId: input.portfolioId },
        orderBy: { executedAt: 'desc' },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        symbol: z.string().min(1).max(20).toUpperCase(),
        quantity: z.number().positive(),
        price: z.number().positive(),
        type: z.enum(['BUY', 'SELL']),
        notes: z.string().max(500).optional(),
        executedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownsPortfolio(ctx, input.portfolioId);
      return ctx.prisma.trade.create({ data: input });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const trade = await ctx.prisma.trade.findUnique({
        where: { id: input.id },
        include: { portfolio: { select: { userId: true } } },
      });

      if (!trade || trade.portfolio.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return ctx.prisma.trade.delete({ where: { id: input.id } });
    }),
});

export const orderRouter = createTRPCRouter({
  getByPortfolio: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ownsPortfolio(ctx, input.portfolioId);
      return ctx.prisma.order.findMany({
        where: { portfolioId: input.portfolioId },
        orderBy: { createdAt: 'desc' },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        symbol: z.string().min(1).max(20).toUpperCase(),
        quantity: z.number().positive(),
        price: z.number().positive().optional(),
        stopPrice: z.number().positive().optional(),
        type: z.enum(['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT']),
        notes: z.string().max(500).optional(),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownsPortfolio(ctx, input.portfolioId);
      return ctx.prisma.order.create({ data: input });
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.id },
        include: { portfolio: { select: { userId: true } } },
      });

      if (!order || order.portfolio.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return ctx.prisma.order.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });
    }),
});
