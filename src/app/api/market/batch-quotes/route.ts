import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('symbols') ?? '';
  const symbols = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 10);

  if (!symbols.length) return NextResponse.json({});

  const token = process.env.FINNHUB_API_KEY;
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`,
          { cache: 'no-store' },
        );
        const d = await res.json();
        return [symbol, { c: d.c ?? 0, d: d.d ?? 0, dp: d.dp ?? 0 }] as const;
      } catch {
        return [symbol, { c: 0, d: 0, dp: 0 }] as const;
      }
    }),
  );

  return NextResponse.json(Object.fromEntries(entries), {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}
