import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface YFQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  typeDisp?: string;
  quoteType?: string;
  isYahooFinance?: boolean;
}

const ALLOWED_TYPES = new Set(['EQUITY', 'ETF', 'INDEX']);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const url =
      `https://query1.finance.yahoo.com/v1/finance/search` +
      `?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0` +
      `&enableFuzzyQuery=false&enableCb=false&enableNavLinks=false&enableEnhancedTrivialQuery=false`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();
    const quotes: YFQuote[] = data.quotes ?? [];

    const results = quotes
      .filter((q) => q.isYahooFinance && q.symbol && ALLOWED_TYPES.has(q.quoteType ?? ''))
      .slice(0, 8)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname ?? q.longname ?? q.symbol,
        exchange: q.exchDisp ?? '',
        type: q.typeDisp ?? '',
      }));

    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
