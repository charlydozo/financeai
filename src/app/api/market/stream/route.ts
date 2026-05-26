export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { ALPACA_STREAM_URL, isAlpacaConfigured } from '@/lib/alpaca';

// Prix de base simulés par symbole
const SEED_PRICES: Record<string, number> = {
  AAPL: 178.72, MSFT: 374.51, NVDA: 495.28, TSLA: 238.83,
  AMZN: 181.14, GOOGL: 140.23, META: 505.17, JPM: 197.45,
  BRK_B: 356.9, V: 273.62, NFLX: 485.2, AMD: 162.5,
};

function seedPrice(symbol: string) {
  return SEED_PRICES[symbol.replace('.', '_')] ?? 150;
}

export async function GET(req: Request) {
  const symbol = (new URL(req.url).searchParams.get('symbol') ?? 'AAPL').toUpperCase();
  const encoder = new TextEncoder();

  const body = new ReadableStream({
    start(controller) {
      const send = (payload: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch { /* client déconnecté */ }
      };

      if (!isAlpacaConfigured()) {
        // ── Mode simulation ──────────────────────────────────────────────────
        let price = seedPrice(symbol);
        let totalVolume = 0;

        const tick = setInterval(() => {
          const drift = (Math.random() - 0.498) * price * 0.0015;
          price = Math.max(0.01, price + drift);
          const spread = price * 0.0008;
          const tradeVol = Math.floor(Math.random() * 2000) + 50;
          totalVolume += tradeVol;

          send({
            T: 'q',
            S: symbol,
            bp: parseFloat((price - spread / 2).toFixed(2)),
            bs: Math.floor(Math.random() * 800) + 100,
            ap: parseFloat((price + spread / 2).toFixed(2)),
            as: Math.floor(Math.random() * 800) + 100,
            lp: parseFloat(price.toFixed(2)),
            v: totalVolume,
            simulated: true,
          });
        }, 1000);

        req.signal.addEventListener('abort', () => {
          clearInterval(tick);
          try { controller.close(); } catch {}
        });

        return;
      }

      // ── Alpaca WebSocket proxy ───────────────────────────────────────────
      const ws = new WebSocket(ALPACA_STREAM_URL);

      ws.addEventListener('message', (event) => {
        let messages: any[];
        try { messages = JSON.parse(event.data as string); } catch { return; }

        for (const msg of messages) {
          switch (msg.T) {
            case 'connected':
              ws.send(JSON.stringify({ action: 'auth', key: process.env.ALPACA_API_KEY, secret: process.env.ALPACA_API_SECRET }));
              break;
            case 'success':
              if (msg.msg === 'authenticated') {
                ws.send(JSON.stringify({ action: 'subscribe', trades: [symbol], quotes: [symbol] }));
              }
              break;
            case 'q':   // quote
              send({ T: 'q', S: msg.S, bp: msg.bp, bs: msg.bs, ap: msg.ap, as: msg.as });
              break;
            case 't':   // trade
              send({ T: 't', S: msg.S, lp: msg.p, v: msg.s });
              break;
            case 'error':
              send({ T: 'error', message: msg.msg });
              break;
          }
        }
      });

      ws.addEventListener('error', () => send({ T: 'error', message: 'Erreur WebSocket Alpaca' }));
      ws.addEventListener('close', () => { try { controller.close(); } catch {} });

      req.signal.addEventListener('abort', () => {
        ws.close();
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
