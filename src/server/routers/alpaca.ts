import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import {
  alpaca,
  isAlpacaConfigured,
  MOCK_ACCOUNT,
  MOCK_POSITIONS,
  MOCK_ORDERS,
} from '@/lib/alpaca';

export const alpacaRouter = createTRPCRouter({
  getAccount: protectedProcedure.query(async () => {
    if (!isAlpacaConfigured()) return MOCK_ACCOUNT;
    return alpaca.getAccount();
  }),

  getPositions: protectedProcedure.query(async () => {
    if (!isAlpacaConfigured()) return MOCK_POSITIONS;
    return alpaca.getPositions();
  }),

  getOrders: protectedProcedure
    .input(z.object({ status: z.enum(['open', 'closed', 'all']).default('open') }))
    .query(async ({ input }) => {
      if (!isAlpacaConfigured()) return MOCK_ORDERS;
      return alpaca.getOrders(input.status);
    }),

  placeOrder: protectedProcedure
    .input(
      z.object({
        symbol: z.string().min(1).max(10).toUpperCase(),
        qty: z.number().positive(),
        side: z.enum(['buy', 'sell']),
        type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
        time_in_force: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
        limit_price: z.number().positive().optional(),
        stop_price: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!isAlpacaConfigured()) {
        return {
          id: `sim-${Date.now()}`,
          symbol: input.symbol,
          qty: String(input.qty),
          filled_qty: '0',
          side: input.side,
          type: input.type,
          time_in_force: input.time_in_force,
          limit_price: input.limit_price ? String(input.limit_price) : null,
          stop_price: input.stop_price ? String(input.stop_price) : null,
          status: 'accepted',
          created_at: new Date().toISOString(),
          filled_at: null,
          filled_avg_price: null,
          simulated: true,
        };
      }

      try {
        return await alpaca.placeOrder(input);
      } catch (err: unknown) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Erreur passage ordre',
        });
      }
    }),

  cancelOrder: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      if (!isAlpacaConfigured() || input.orderId.startsWith('sim-')) {
        return { cancelled: true };
      }

      try {
        await alpaca.cancelOrder(input.orderId);
        return { cancelled: true };
      } catch (err: unknown) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Erreur annulation ordre',
        });
      }
    }),
});
