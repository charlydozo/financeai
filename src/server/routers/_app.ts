import { createTRPCRouter } from '../trpc';
import { portfolioRouter } from './portfolio';
import { tradeRouter, orderRouter } from './trade';
import { subscriptionRouter } from './subscription';
import { alpacaRouter } from './alpaca';
import { alertRouter } from './alert';
import { strategyRouter } from './strategy';

export const appRouter = createTRPCRouter({
  portfolio: portfolioRouter,
  trade: tradeRouter,
  order: orderRouter,
  subscription: subscriptionRouter,
  alpaca: alpacaRouter,
  alert: alertRouter,
  strategy: strategyRouter,
});

export type AppRouter = typeof appRouter;
