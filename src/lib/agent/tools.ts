import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { rsi, macd, sma, ema } from '@/lib/indicators';
import { prisma } from '@/lib/prisma';

// ─── Cache (module-level, persiste entre les requêtes dans le même process) ───

const TTL_CANDLES = 5 * 60 * 1000;   // 5 min — données journalières stables
const TTL_SENTIMENT = 5 * 60 * 1000; // 5 min — fondamentaux/analystes stables
const TTL_PRICE = 60 * 1000;         // 1 min — prix courant plus volatile

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data as T;
}

function cacheSet(key: string, data: unknown, ttl: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ─── Retry avec délai exponentiel ────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts - 1) {
        // 500 ms → 1 000 ms entre les tentatives
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}

// ─── Finnhub helpers ──────────────────────────────────────────────────────────

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

async function finnhubGet(path: string): Promise<any> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) throw new Error('FINNHUB_API_KEY non configurée');
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${FINNHUB_BASE}${path}${sep}token=${token}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${path}`);
  return res.json();
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchDailyCandles(symbol: string, days = 365): Promise<Candle[]> {
  const key = `candles:${symbol}:${days}`;
  const cached = cacheGet<Candle[]>(key);
  if (cached) return cached;

  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;

  const data = await withRetry(() =>
    finnhubGet(`/stock/candle?symbol=${encodeURIComponent(symbol.toUpperCase())}&resolution=D&from=${from}&to=${to}`)
  );

  if (data.s !== 'ok' || !data.t?.length) throw new Error(`Pas de données Finnhub pour ${symbol}`);

  const candles: Candle[] = data.t.map((t: number, i: number) => ({
    time: t,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v[i] ?? 0,
  }));

  cacheSet(key, candles, TTL_CANDLES);
  return candles;
}

async function fetchQuoteSummary(symbol: string): Promise<any> {
  const key = `sentiment:${symbol}`;
  const cached = cacheGet<any>(key);
  if (cached) return cached;

  const sym = encodeURIComponent(symbol.toUpperCase());
  const [recommendation, metricRes, quote] = await withRetry(() =>
    Promise.all([
      finnhubGet(`/stock/recommendation?symbol=${sym}`),
      finnhubGet(`/stock/metric?symbol=${sym}&metric=all`),
      finnhubGet(`/quote?symbol=${sym}`),
    ])
  );

  const summary = { recommendation, metric: metricRes?.metric ?? {}, quote };
  cacheSet(key, summary, TTL_SENTIMENT);
  return summary;
}

async function getCurrentPrice(symbol: string): Promise<number> {
  const key = `price:${symbol}`;
  const cached = cacheGet<number>(key);
  if (cached) return cached;

  const price = await withRetry(async () => {
    const data = await finnhubGet(`/quote?symbol=${encodeURIComponent(symbol.toUpperCase())}`);
    const p = data.c;
    if (!p) throw new Error(`Prix introuvable pour ${symbol}`);
    return p as number;
  });

  cacheSet(key, price, TTL_PRICE);
  return price;
}

// ─── Données simulées (fallback si Finnhub échoue après 3 tentatives) ────────

function mockCandles(symbol: string, days = 200): Candle[] {
  // Seed déterministe basé sur le symbole pour des résultats reproductibles
  const seed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pseudoRand = (i: number) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };

  const now = Math.floor(Date.now() / 1000);
  const basePrice = 100 + (seed % 400); // prix de base entre 100 et 500
  const candles: Candle[] = [];
  let price = basePrice;

  for (let i = days - 1; i >= 0; i--) {
    const r = pseudoRand(i);
    const open = price;
    const change = (r - 0.48) * price * 0.015;
    const close = Math.max(1, price + change);
    candles.push({
      time: now - i * 86400,
      open: +open.toFixed(2),
      high: +(Math.max(open, close) * (1 + pseudoRand(i + 1000) * 0.008)).toFixed(2),
      low: +(Math.min(open, close) * (1 - pseudoRand(i + 2000) * 0.008)).toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(pseudoRand(i + 3000) * 8_000_000) + 1_000_000,
    });
    price = close;
  }
  return candles;
}

function mockSentimentData(symbol: string) {
  return {
    symbol: symbol.toUpperCase(),
    dataSource: 'Données simulées (Finnhub indisponible)',
    simulated: true,
    valuation: {
      pe: null,
      forwardPE: null,
      beta: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
    },
    fundamentals: {
      targetPrice: null,
      currentRatio: null,
      revenueGrowth: null,
      recommendationKey: null,
    },
    analystConsensus: {
      strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0,
      total: 0,
      bullishScore: null,
    },
    sentiment: 'indisponible — Finnhub indisponible, données fondamentales non disponibles',
  };
}

// ─── get_market_data ──────────────────────────────────────────────────────────

export const getMarketDataTool = tool(
  async ({ symbol }) => {
    let candles: Candle[];
    let simulated = false;

    try {
      candles = await fetchDailyCandles(symbol, 365);
    } catch {
      // Fallback : données simulées après 3 tentatives échouées
      candles = mockCandles(symbol, 200);
      simulated = true;
    }

    if (!candles.length) return JSON.stringify({ error: 'Aucune donnée disponible' });

    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);
    const last = candles.at(-1)!;
    const prev = candles.at(-2);
    const prev5 = candles.at(-6);
    const prev20 = candles.at(-21);

    const sma20val = sma(closes, 20).at(-1);
    const sma50val = sma(closes, 50).at(-1);
    const sma200val = sma(closes, 200).at(-1);
    const ema12val = ema(closes, 12).at(-1);
    const ema26val = ema(closes, 26).at(-1);
    const rsiVal = rsi(closes.slice(-50));
    const macdVal = macd(closes.slice(-80));
    const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    return JSON.stringify({
      symbol: symbol.toUpperCase(),
      dataSource: simulated ? 'Données simulées (Finnhub indisponible)' : 'Finnhub',
      simulated,
      price: {
        last: last.close,
        open: last.open,
        high: last.high,
        low: last.low,
        volume: last.volume,
        avgVolume20d: Math.round(avgVol20),
        change1d: prev
          ? `${(((last.close - prev.close) / prev.close) * 100).toFixed(2)}%`
          : null,
        change5d: prev5
          ? `${(((last.close - prev5.close) / prev5.close) * 100).toFixed(2)}%`
          : null,
        change1m: prev20
          ? `${(((last.close - prev20.close) / prev20.close) * 100).toFixed(2)}%`
          : null,
      },
      indicators: {
        sma20: sma20val?.toFixed(2) ?? null,
        sma50: sma50val?.toFixed(2) ?? null,
        sma200: sma200val?.toFixed(2) ?? null,
        ema12: ema12val?.toFixed(2) ?? null,
        ema26: ema26val?.toFixed(2) ?? null,
        rsi14: rsiVal?.toFixed(1) ?? null,
        rsiSignal:
          rsiVal == null ? null
          : rsiVal >= 70 ? 'suracheté'
          : rsiVal <= 30 ? 'survendu'
          : 'neutre',
        macd: macdVal
          ? {
              line: macdVal.macd.toFixed(4),
              signal: macdVal.signal.toFixed(4),
              histogram: macdVal.histogram.toFixed(4),
              crossover: macdVal.histogram > 0 ? 'haussier' : 'baissier',
            }
          : null,
        trend:
          sma20val && sma50val
            ? sma20val > sma50val ? 'haussier (SMA20 > SMA50)' : 'baissier (SMA20 < SMA50)'
            : 'indéterminé',
      },
    });
  },
  {
    name: 'get_market_data',
    description:
      'Récupère les données de marché journalières et les indicateurs techniques (RSI, MACD, SMA20/50/200, EMA12/26) via Finnhub avec cache 5 min et retry x3. Retourne des données simulées si Finnhub est indisponible.',
    schema: z.object({
      symbol: z.string().describe('Symbole boursier (ex: AAPL, MSFT, TSLA, BTC-USD)'),
    }),
  },
);

// ─── analyze_sentiment ────────────────────────────────────────────────────────

export const analyzeSentimentTool = tool(
  async ({ symbol }) => {
    let summary: any;

    try {
      summary = await fetchQuoteSummary(symbol);
    } catch {
      return JSON.stringify(mockSentimentData(symbol));
    }

    const reco = summary?.recommendation?.[0];
    const m = summary?.metric ?? {};

    const strongBuy = reco?.strongBuy ?? 0;
    const buy = reco?.buy ?? 0;
    const hold = reco?.hold ?? 0;
    const sell = reco?.sell ?? 0;
    const strongSell = reco?.strongSell ?? 0;
    const totalAnalysts = strongBuy + buy + hold + sell + strongSell;
    const bullScore =
      totalAnalysts > 0 ? ((strongBuy * 2 + buy) / (totalAnalysts * 2)) * 100 : null;

    return JSON.stringify({
      symbol: symbol.toUpperCase(),
      dataSource: 'Finnhub',
      simulated: false,
      valuation: {
        pe: m.peBasicExclExtraTTM?.toFixed(2) ?? null,
        forwardPE: m.peNormalizedAnnual?.toFixed(2) ?? null,
        beta: m.beta?.toFixed(2) ?? null,
        fiftyTwoWeekHigh: m['52WeekHigh'] ?? null,
        fiftyTwoWeekLow: m['52WeekLow'] ?? null,
      },
      fundamentals: {
        targetPrice: m.targetPrice ?? null,
        currentRatio: m.currentRatioQuarterly?.toFixed(2) ?? null,
        revenueGrowth: m.revenueGrowthTTMYoy != null
          ? `${(m.revenueGrowthTTMYoy as number).toFixed(1)}%`
          : null,
        recommendationKey: reco
          ? (bullScore !== null && bullScore >= 60 ? 'buy' : bullScore !== null && bullScore >= 40 ? 'hold' : 'sell')
          : null,
      },
      analystConsensus: {
        strongBuy, buy, hold, sell, strongSell,
        total: totalAnalysts,
        bullishScore: bullScore ? `${bullScore.toFixed(0)}%` : null,
      },
      sentiment:
        bullScore === null ? 'données insuffisantes'
        : bullScore >= 60 ? 'très positif'
        : bullScore >= 40 ? 'neutre à positif'
        : bullScore >= 20 ? 'mitigé'
        : 'négatif',
    });
  },
  {
    name: 'analyze_sentiment',
    description:
      'Analyse le sentiment du marché via Finnhub (cache 5 min, retry x3) : consensus analystes, P/E, beta, cible de prix. Retourne données simulées si indisponible.',
    schema: z.object({
      symbol: z.string().describe('Symbole boursier à analyser'),
    }),
  },
);

// ─── get_portfolio_state ──────────────────────────────────────────────────────

export function createPortfolioTool(userId: string) {
  return tool(
    async () => {
      const portfolios = await prisma.portfolio.findMany({
        where: { userId },
        include: { trades: true },
      });

      if (!portfolios.length) {
        return JSON.stringify({
          message: 'Aucun portefeuille trouvé. Créez-en un depuis la page Portefeuille.',
          positions: [],
          summary: { totalPositions: 0, totalMarketValue: '0.00', totalUnrealizedPL: '0.00' },
        });
      }

      type PositionAgg = { qty: number; totalCost: number };
      const agg: Record<string, PositionAgg> = {};

      for (const portfolio of portfolios) {
        for (const trade of portfolio.trades) {
          if (!agg[trade.symbol]) agg[trade.symbol] = { qty: 0, totalCost: 0 };
          if (trade.type === 'BUY') {
            agg[trade.symbol].qty += trade.quantity;
            agg[trade.symbol].totalCost += trade.price * trade.quantity;
          } else {
            agg[trade.symbol].qty -= trade.quantity;
            agg[trade.symbol].totalCost -= trade.price * trade.quantity;
          }
        }
      }

      const openSymbols = Object.entries(agg).filter(([, v]) => v.qty > 0);

      if (!openSymbols.length) {
        return JSON.stringify({
          portfolios: portfolios.map((p) => p.name),
          positions: [],
          summary: { totalPositions: 0, totalMarketValue: '0.00', totalUnrealizedPL: '0.00' },
        });
      }

      const positions = await Promise.all(
        openSymbols.map(async ([symbol, { qty, totalCost }]) => {
          const avgEntry = totalCost / qty;
          let currentPrice: number | null = null;
          try {
            currentPrice = await getCurrentPrice(symbol);
          } catch {
            // Prix indisponible, on affiche N/A
          }
          const marketValue = currentPrice != null ? currentPrice * qty : null;
          const unrealizedPL = marketValue != null ? marketValue - totalCost : null;
          return {
            symbol,
            qty,
            avgEntryPrice: avgEntry.toFixed(2),
            currentPrice: currentPrice?.toFixed(2) ?? 'N/A',
            marketValue: marketValue?.toFixed(2) ?? 'N/A',
            unrealizedPL: unrealizedPL?.toFixed(2) ?? 'N/A',
            unrealizedPLPct:
              unrealizedPL != null && totalCost > 0
                ? `${((unrealizedPL / totalCost) * 100).toFixed(2)}%`
                : null,
          };
        }),
      );

      const totalMarketValue = positions.reduce((s, p) => s + (parseFloat(p.marketValue) || 0), 0);
      const totalUnrealizedPL = positions.reduce((s, p) => s + (parseFloat(p.unrealizedPL) || 0), 0);

      return JSON.stringify({
        dataSource: 'Finnhub (prix) + Base de données (trades)',
        portfolios: portfolios.map((p) => p.name),
        positions,
        summary: {
          totalPositions: positions.length,
          totalMarketValue: totalMarketValue.toFixed(2),
          totalUnrealizedPL: totalUnrealizedPL.toFixed(2),
        },
      });
    },
    {
      name: 'get_portfolio_state',
      description:
        "Récupère les positions ouvertes depuis la base de données et leur P&L via les prix Finnhub (cache 1 min).",
      schema: z.object({}),
    },
  );
}

// ─── execute_order ────────────────────────────────────────────────────────────

export function createExecuteOrderTool(userId: string) {
  return tool(
    async ({ symbol, qty, side, type, limitPrice }) => {
      let executionPrice: number;
      if (type === 'market') {
        try {
          executionPrice = await getCurrentPrice(symbol);
        } catch (err: any) {
          return JSON.stringify({ error: `Prix introuvable pour ${symbol}: ${err.message}` });
        }
      } else {
        if (!limitPrice) return JSON.stringify({ error: 'limitPrice requis pour les ordres limit/stop' });
        executionPrice = limitPrice;
      }

      let portfolio = await prisma.portfolio.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      if (!portfolio) {
        portfolio = await prisma.portfolio.create({
          data: {
            userId,
            name: 'Paper Trading',
            description: 'Portefeuille paper trading — Agent IA',
          },
        });
      }

      const trade = await prisma.trade.create({
        data: {
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase(),
          quantity: qty,
          price: executionPrice,
          type: side === 'buy' ? 'BUY' : 'SELL',
          notes: `Agent IA — ${type} order`,
        },
      });

      return JSON.stringify({
        success: true,
        tradeId: trade.id,
        symbol: trade.symbol,
        qty,
        side,
        type,
        executedPrice: executionPrice.toFixed(2),
        totalValue: (executionPrice * qty).toFixed(2),
        portfolio: portfolio.name,
        executedAt: trade.executedAt,
        message: `Ordre exécuté : ${side.toUpperCase()} ${qty} × ${symbol} @ $${executionPrice.toFixed(2)} = $${(executionPrice * qty).toFixed(2)} (paper trading)`,
      });
    },
    {
      name: 'execute_order',
      description:
        "Enregistre un ordre paper trading en base de données avec le prix Finnhub. IMPORTANT : toujours demander confirmation explicite avant d'appeler ce tool.",
      schema: z.object({
        symbol: z.string().describe('Symbole boursier'),
        qty: z.number().positive().describe('Quantité de titres'),
        side: z.enum(['buy', 'sell']).describe('Achat ou vente'),
        type: z.enum(['market', 'limit', 'stop']).describe("Type d'ordre"),
        limitPrice: z.number().optional().describe('Prix limite pour les ordres limit/stop'),
      }),
    },
  );
}

// ─── set_alert ────────────────────────────────────────────────────────────────

export function createSetAlertTool(userId: string) {
  return tool(
    async ({ symbol, condition, threshold, action }) => {
      const alert = await prisma.alert.create({
        data: { userId, symbol: symbol.toUpperCase(), condition, threshold, action },
      });
      return JSON.stringify({
        alertId: alert.id,
        symbol: alert.symbol,
        condition,
        threshold,
        action,
        message: `Alerte créée : ${condition} ${threshold} pour ${symbol} → ${action}`,
      });
    },
    {
      name: 'set_alert',
      description:
        "Crée une alerte sur condition de marché (prix, RSI, volume) et l'enregistre en base de données.",
      schema: z.object({
        symbol: z.string().describe('Symbole concerné'),
        condition: z
          .enum(['price_above', 'price_below', 'rsi_above', 'rsi_below', 'volume_spike'])
          .describe('Condition de déclenchement'),
        threshold: z.number().describe('Valeur seuil'),
        action: z
          .string()
          .describe('Action en français (ex: "Notifier", "Acheter 5 AAPL au marché")'),
      }),
    },
  );
}
