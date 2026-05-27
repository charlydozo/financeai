import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, proProcedure } from '../trpc';

// ─── Config schemas ───────────────────────────────────────────────────────────

const smartplanConfigSchema = z.object({
  symbols: z.array(z.string().min(1).max(10).toUpperCase()).min(1).max(10),
  amountPerSymbol: z.number().positive(),
  frequency: z.enum(['weekly', 'monthly']),
  startDate: z.string(),
  nextRun: z.string(),
  totalInvested: z.number().default(0),
});

const straddleConfigSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  strike: z.number().positive(),
  expiry: z.string(),
  callPremium: z.number().nonnegative(),
  putPremium: z.number().nonnegative(),
  quantity: z.number().int().positive().default(1),
});

const butterflyConfigSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  lowStrike: z.number().positive(),
  midStrike: z.number().positive(),
  highStrike: z.number().positive(),
  netDebit: z.number().nonnegative(),
  expiry: z.string(),
  quantity: z.number().int().positive().default(1),
});

const strangleConfigSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  callStrike: z.number().positive(),
  putStrike: z.number().positive(),
  callPremium: z.number().nonnegative(),
  putPremium: z.number().nonnegative(),
  expiry: z.string(),
  quantity: z.number().int().positive().default(1),
});

// ─── DCA execution logic (shared with cron route) ────────────────────────────

async function executeDCA(
  prisma: any,
  strategy: { id: string; userId: string; config: any; name: string },
): Promise<{ trades: string[]; totalSpent: number }> {
  const config = strategy.config as z.infer<typeof smartplanConfigSchema>;

  // Resolve prices via Finnhub
  const finnhubToken = process.env.FINNHUB_API_KEY;
  const prices: Record<string, number> = {};
  for (const symbol of config.symbols) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubToken}`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      prices[symbol] = data.c ?? 0;
    } catch {
      prices[symbol] = 0;
    }
  }

  // Get or create DCA portfolio
  let portfolio = await prisma.portfolio.findFirst({
    where: { userId: strategy.userId, name: `DCA — ${strategy.name}` },
  });
  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: {
        userId: strategy.userId,
        name: `DCA — ${strategy.name}`,
        description: 'Portefeuille géré par la stratégie SMARTPLAN',
      },
    });
  }

  const trades: string[] = [];
  let totalSpent = 0;

  for (const symbol of config.symbols) {
    const price = prices[symbol];
    if (!price || price <= 0) continue;
    const qty = config.amountPerSymbol / price;
    await prisma.trade.create({
      data: {
        portfolioId: portfolio.id,
        symbol,
        quantity: qty,
        price,
        type: 'BUY',
        notes: `DCA automatique — ${strategy.name}`,
      },
    });
    trades.push(`${symbol}: ${qty.toFixed(4)} @ $${price.toFixed(2)}`);
    totalSpent += config.amountPerSymbol;
  }

  // Update nextRun and totalInvested
  const nextRun = new Date(config.nextRun);
  if (config.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
  else nextRun.setMonth(nextRun.getMonth() + 1);

  await prisma.strategy.update({
    where: { id: strategy.id },
    data: {
      config: {
        ...config,
        nextRun: nextRun.toISOString(),
        totalInvested: (config.totalInvested ?? 0) + totalSpent,
      },
    },
  });

  await prisma.strategyExecution.create({
    data: {
      strategyId: strategy.id,
      result: { trades, totalSpent, prices },
      notes: `Exécution DCA automatique`,
    },
  });

  return { trades, totalSpent };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const strategyRouter = createTRPCRouter({
  list: proProcedure.query(async ({ ctx }) => {
    return ctx.prisma.strategy.findMany({
      where: { userId: ctx.session.user.id, status: { not: 'EXPIRED' } },
      include: { executions: { orderBy: { executedAt: 'desc' }, take: 3 } },
      orderBy: { createdAt: 'desc' },
    });
  }),

  create: proProcedure
    .input(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('SMARTPLAN'), name: z.string().min(1), config: smartplanConfigSchema }),
        z.object({ type: z.literal('STRADDLE'), name: z.string().min(1), config: straddleConfigSchema }),
        z.object({ type: z.literal('BUTTERFLY'), name: z.string().min(1), config: butterflyConfigSchema }),
        z.object({ type: z.literal('STRANGLE'), name: z.string().min(1), config: strangleConfigSchema }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.strategy.create({
        data: {
          userId: ctx.session.user.id,
          type: input.type,
          name: input.name,
          config: input.config,
        },
      });
    }),

  toggle: proProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.prisma.strategy.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!strategy) throw new TRPCError({ code: 'NOT_FOUND' });
      const next = strategy.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      return ctx.prisma.strategy.update({ where: { id: input.id }, data: { status: next } });
    }),

  delete: proProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.prisma.strategy.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!strategy) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.prisma.strategy.update({ where: { id: input.id }, data: { status: 'EXPIRED' } });
    }),

  generateReport: proProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.prisma.strategy.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: { executions: { orderBy: { executedAt: 'desc' }, take: 5 } },
      });
      if (!strategy) throw new TRPCError({ code: 'NOT_FOUND' });

      // Collect market context
      const config = strategy.config as any;
      const symbols: string[] = config.symbols ?? (config.symbol ? [config.symbol] : []);
      const marketLines: string[] = [];

      const finnhubToken = process.env.FINNHUB_API_KEY;
      for (const symbol of symbols.slice(0, 3)) {
        try {
          const to = Math.floor(Date.now() / 1000);
          const from = to - 30 * 86400;
          const res = await fetch(
            `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${finnhubToken}`,
            { cache: 'no-store' },
          );
          const data = await res.json();
          if (data.s === 'ok' && data.c?.length >= 2) {
            const lastClose: number = data.c.at(-1);
            const firstClose: number = data.c[0];
            const pct = (((lastClose - firstClose) / firstClose) * 100).toFixed(2);
            marketLines.push(`${symbol}: $${lastClose.toFixed(2)} (${pct}% sur 30j)`);
          }
        } catch {
          // ignore
        }
      }

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const strategyDesc: Record<string, string> = {
        SMARTPLAN: 'DCA (Dollar Cost Averaging) — achats périodiques automatiques',
        STRADDLE: 'Straddle — achat simultané Call + Put même strike (parie sur la volatilité)',
        BUTTERFLY: 'Butterfly Spread — profit max si le prix reste proche du strike central',
        STRANGLE: 'Strangle — Call OTM + Put OTM (parie sur forte volatilité à moindre coût)',
      };

      const prompt = `Tu es un analyste financier expert. Génère un rapport d'analyse structuré et concis pour cette stratégie de trading.

Type: ${strategy.type} — ${strategyDesc[strategy.type]}
Nom: ${strategy.name}
Statut: ${strategy.status}
Configuration: ${JSON.stringify(strategy.config, null, 2)}
Données marché (30j): ${marketLines.join(' | ') || 'Non disponibles'}
Dernières exécutions: ${strategy.executions.length} exécution(s)${strategy.executions.length ? ', dernière: ' + new Date(strategy.executions[0].executedAt).toLocaleDateString('fr-FR') : ''}

Rédige en français, de façon structurée avec ces sections :
## Résumé de la stratégie
## Contexte de marché
## Analyse des risques
## Recommandation`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      const report = response.content[0].type === 'text' ? response.content[0].text : '';

      await ctx.prisma.strategy.update({ where: { id: input.id }, data: { aiReport: report } });
      return { report };
    }),

  executeNow: proProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.prisma.strategy.findFirst({
        where: { id: input.id, userId: ctx.session.user.id, type: 'SMARTPLAN' },
      });
      if (!strategy) throw new TRPCError({ code: 'NOT_FOUND' });

      const result = await executeDCA(ctx.prisma, {
        id: strategy.id,
        userId: strategy.userId,
        config: strategy.config,
        name: strategy.name,
      });

      return result;
    }),
});

export { executeDCA };
