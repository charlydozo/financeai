import { type NextRequest, NextResponse } from 'next/server';

type Interval = '1d' | '1h' | '5m';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } },
) {
  const symbol = params.symbol.toUpperCase();
  const interval = (req.nextUrl.searchParams.get('interval') ?? '1d') as Interval;

  // Alpaca bars pour intraday (plus fiable que Yahoo Finance pour 1h/5m)
  const alpacaConfigured =
    (process.env.ALPACA_API_KEY?.length ?? 0) > 10 &&
    !process.env.ALPACA_API_KEY?.startsWith('your_');

  if (interval !== '1d' && alpacaConfigured) {
    try {
      const candles = await fetchAlpacaBars(symbol, interval);
      return NextResponse.json({ symbol, interval, candles });
    } catch {
      return NextResponse.json({ symbol, interval, candles: mockCandles(interval) });
    }
  }

  // Finnhub pour les données journalières
  try {
    const token = process.env.FINNHUB_API_KEY;
    const lookbackDays: Record<string, number> = { '1d': 90, '1h': 7, '5m': 3 };
    const to = Math.floor(Date.now() / 1000);
    const from = to - (lookbackDays[interval] ?? 90) * 86400;

    const res = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${token}`,
      { cache: 'no-store' },
    );
    const data = await res.json();

    if (data.s !== 'ok' || !data.t?.length) throw new Error('no data');

    const candles: Candle[] = data.t.map((t: number, i: number) => ({
      time: t,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i] ?? 0,
    }));

    return NextResponse.json({ symbol, interval, candles });
  } catch {
    return NextResponse.json({ symbol, interval, candles: mockCandles(interval) });
  }
}

async function fetchAlpacaBars(symbol: string, interval: Interval): Promise<Candle[]> {
  const timeframeMap: Record<string, string> = { '1h': '1Hour', '5m': '5Min' };
  const startMap: Record<string, string> = {
    '1h': new Date(Date.now() - 7 * 86400_000).toISOString(),
    '5m': new Date(Date.now() - 3 * 86400_000).toISOString(),
  };

  const url = `https://data.alpaca.markets/v2/stocks/${symbol}/bars?timeframe=${timeframeMap[interval]}&start=${startMap[interval]}&limit=1000&feed=iex`;
  const res = await fetch(url, {
    headers: {
      'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
      'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET!,
    },
  });

  if (!res.ok) throw new Error(`Alpaca bars ${res.status}`);
  const data = await res.json();

  return (data.bars ?? []).map((b: any) => ({
    time: Math.floor(new Date(b.t).getTime() / 1000),
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    volume: b.v,
  }));
}

function mockCandles(interval: Interval): Candle[] {
  const count = interval === '1d' ? 90 : interval === '1h' ? 168 : 288;
  const stepSec = interval === '1d' ? 86400 : interval === '1h' ? 3600 : 300;
  const now = Math.floor(Date.now() / 1000);

  const candles: Candle[] = [];
  let price = 178;

  for (let i = count - 1; i >= 0; i--) {
    const open = price;
    const change = (Math.random() - 0.48) * price * 0.015;
    const close = Math.max(1, price + change);
    candles.push({
      time: now - i * stepSec,
      open: +open.toFixed(2),
      high: +(Math.max(open, close) * (1 + Math.random() * 0.008)).toFixed(2),
      low: +(Math.min(open, close) * (1 - Math.random() * 0.008)).toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(Math.random() * 8_000_000) + 1_000_000,
    });
    price = close;
  }

  return candles;
}
